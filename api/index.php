<?php
declare(strict_types=1);
/**
 * GramSakhi API  –  http://localhost/gramsakhi/api/index.php?a=<action>
 * Needs PHP 8.1+ (current XAMPP) and MySQL/MariaDB.
 * GET  actions: bootstrap, my_orders, my_reviews
 * POST actions (JSON body): register, login, logout, product_add, product_stock,
 *                           product_delete, order_create, order_status,
 *                           member_add, review_add, message_add
 */
require __DIR__ . '/config.php';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

session_name('gs_sess');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
session_start();

/* ---------- small helpers ---------- */
function out(array $d, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): never
{
    out(['error' => $msg], $code);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            error_log('[GramSakhi] DB connect: ' . $e->getMessage());
            fail('डेटाबेस नहीं मिला। MySQL चालू करें और database.sql इम्पोर्ट करें।', 503);
        }
    }
    return $pdo;
}

/** POST bodies must be JSON – a plain cross-site <form> cannot send that. */
function body(): array
{
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        fail('अमान्य अनुरोध', 415);
    }
    $j = json_decode((string) file_get_contents('php://input'), true);
    return is_array($j) ? $j : [];
}

function txt(mixed $v, int $max): string
{
    return is_scalar($v) ? mb_substr(trim((string) $v), 0, $max) : '';
}

/** Keeps the last 10 digits; '' if there are fewer than 10. */
function phone(mixed $v): string
{
    $d = preg_replace('/\D+/', '', is_scalar($v) ? (string) $v : '');
    return strlen($d) >= 10 ? substr($d, -10) : '';
}

function need_seller(): int
{
    if (empty($_SESSION['sid'])) {
        fail('पहले लॉगिन करें', 401);
    }
    return (int) $_SESSION['sid'];
}

/** Customers have no login; their browser gets a random token cookie that links their orders and reviews. */
function cust_token(bool $create = false): string
{
    $t = $_COOKIE['gs_cust'] ?? '';
    if (is_string($t) && preg_match('/^[a-f0-9]{32}$/', $t)) {
        return $t;
    }
    if (!$create) {
        return '';
    }
    $t = bin2hex(random_bytes(16));
    setcookie('gs_cust', $t, ['expires' => time() + 86400 * 365, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
    $_COOKIE['gs_cust'] = $t;
    return $t;
}

const ORDER_COLS = 'id, product_id AS pid, seller_id AS sid, product_name AS pname, qty AS q, total,
                    customer_name AS cname, customer_phone AS phone, customer_addr AS addr,
                    pay_method AS pay, status';

function order_row(array $o): array
{
    return [
        'id' => (int) $o['id'],
        'pid' => $o['pid'] === null ? null : (int) $o['pid'],
        'sid' => (int) $o['sid'],
        'pname' => $o['pname'],
        'q' => (int) $o['q'],
        'total' => (int) $o['total'],
        'cname' => $o['cname'],
        'phone' => $o['phone'],
        'addr' => $o['addr'],
        'pay' => $o['pay'],
        'status' => $o['status'],
    ];
}

/** Accepts a "data:image/jpeg|png;base64,..." string, checks it really is an image, saves it, returns its URL. */
function save_image(mixed $d): string
{
    if (!is_string($d) || $d === '') {
        return '';
    }
    $p = strpos($d, ';base64,');
    if ($p === false || $p > 30) {
        return '';
    }
    $head = substr($d, 0, $p);
    if ($head !== 'data:image/jpeg' && $head !== 'data:image/png') {
        return '';
    }
    $raw = base64_decode(substr($d, $p + 8), true);
    if ($raw === false || strlen($raw) > 1500000) {
        return '';
    }
    $info = @getimagesizefromstring($raw);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true)) {
        return '';
    }
    $ext = $info[2] === IMAGETYPE_PNG ? 'png' : 'jpg';
    if (function_exists('imagecreatefromstring')) {      // re-encode: drops anything hidden in the file
        $im = @imagecreatefromstring($raw);
        if (!$im) {
            return '';
        }
        ob_start();
        imagejpeg($im, null, 80);
        $raw = (string) ob_get_clean();
        $ext = 'jpg';
    }
    if (!is_dir(UPLOAD_DIR)) {
        @mkdir(UPLOAD_DIR, 0775, true);
    }
    $name = bin2hex(random_bytes(12)) . '.' . $ext;
    if (@file_put_contents(UPLOAD_DIR . $name, $raw) === false) {
        error_log('[GramSakhi] cannot write to uploads/ – check folder permissions');
        return '';
    }
    return UPLOAD_URL . $name;
}

/* ---------- GET handlers ---------- */
function h_bootstrap(): never
{
    $db = db();
    $members = [];
    foreach ($db->query('SELECT seller_id, name FROM members ORDER BY id') as $m) {
        $members[(int) $m['seller_id']][] = $m['name'];
    }
    $sellers = [];
    foreach ($db->query('SELECT id, kind, name, shg_name, village, story, upi FROM sellers ORDER BY id') as $s) {
        $sellers[] = [
            'id' => (int) $s['id'], 'kind' => $s['kind'], 'name' => $s['name'], 'shg' => $s['shg_name'],
            'village' => $s['village'], 'story' => $s['story'], 'upi' => $s['upi'],
            'members' => $members[(int) $s['id']] ?? [],
        ];
    }
    $products = [];
    foreach ($db->query('SELECT id, seller_id, name, price, stock, category, story, image FROM products ORDER BY id') as $p) {
        $products[] = [
            'id' => (int) $p['id'], 'sid' => (int) $p['seller_id'], 'name' => $p['name'],
            'price' => (int) $p['price'], 'stock' => (int) $p['stock'], 'cat' => $p['category'],
            'story' => $p['story'], 'image' => $p['image'],
        ];
    }
    $reviews = [];
    foreach ($db->query('SELECT product_id, rating, review_text, reviewer_name FROM reviews ORDER BY id') as $r) {
        $reviews[] = ['pid' => (int) $r['product_id'], 'r' => (int) $r['rating'], 't' => $r['review_text'], 'name' => $r['reviewer_name']];
    }
    $sid = (int) ($_SESSION['sid'] ?? 0);
    $orders = [];
    if ($sid) {   // a seller only ever receives her own orders
        $st = $db->prepare('SELECT ' . ORDER_COLS . ' FROM orders WHERE seller_id = ? ORDER BY id');
        $st->execute([$sid]);
        $orders = array_map('order_row', $st->fetchAll());
    }
    out(compact('sellers', 'products', 'reviews', 'sid', 'orders'));
}

function h_my_orders(): never
{
    $tok = cust_token();
    $orders = [];
    if ($tok !== '') {
        $st = db()->prepare('SELECT ' . ORDER_COLS . ' FROM orders WHERE cust_token = ? ORDER BY id');
        $st->execute([$tok]);
        $orders = array_map('order_row', $st->fetchAll());
    }
    out(['orders' => $orders]);
}

function h_my_reviews(): never
{
    $tok = cust_token();
    $list = [];
    if ($tok !== '') {
        $st = db()->prepare('SELECT product_id, rating, review_text FROM reviews WHERE cust_token = ? ORDER BY id DESC');
        $st->execute([$tok]);
        foreach ($st->fetchAll() as $r) {
            $list[] = ['pid' => (int) $r['product_id'], 'r' => (int) $r['rating'], 't' => $r['review_text']];
        }
    }
    out(['reviews' => $list]);
}

/* ---------- POST handlers ---------- */
function h_register(array $i): never
{
    $kind = ($i['kind'] ?? '') === 'group' ? 'group' : 'individual';
    $name = txt($i['name'] ?? '', 80);
    $ph = phone($i['phone'] ?? '');
    $pin = is_scalar($i['pin'] ?? null) ? (string) $i['pin'] : '';
    if ($name === '' || $ph === '' || !preg_match('/^\d{4}$/', $pin)) {
        fail('नाम, फ़ोन नंबर और 4 अंक का पिन ज़रूरी है');
    }
    $db = db();
    $db->beginTransaction();
    try {
        $db->prepare('INSERT INTO sellers (kind, name, phone, pin_hash, shg_name, village, story, upi)
                      VALUES (?,?,?,?,?,?,?,?)')
           ->execute([$kind, $name, $ph, password_hash($pin, PASSWORD_DEFAULT),
                      txt($i['shg'] ?? '', 120), txt($i['village'] ?? '', 80),
                      txt($i['story'] ?? '', 1000), txt($i['upi'] ?? '', 80)]);
        $id = (int) $db->lastInsertId();
        $m = $db->prepare('INSERT INTO members (seller_id, name) VALUES (?,?)');
        $list = is_array($i['members'] ?? null) ? array_slice($i['members'], 0, 50) : [];
        foreach ($list as $n) {
            $n = txt($n, 60);
            if ($n !== '') {
                $m->execute([$id, $n]);
            }
        }
        $db->commit();
    } catch (PDOException $e) {
        $db->rollBack();
        if ($e->getCode() === '23000') {
            fail('यह फ़ोन नंबर पहले से जुड़ा है', 409);
        }
        throw $e;
    }
    session_regenerate_id(true);
    $_SESSION['sid'] = $id;
    out(['ok' => true]);
}

function h_login(array $i): never
{
    $ph = phone($i['phone'] ?? '');
    $pin = is_scalar($i['pin'] ?? null) ? (string) $i['pin'] : '';
    $db = db();
    $db->exec('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)');
    $c = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE phone = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
    $c->execute([$ph]);
    if ((int) $c->fetchColumn() >= MAX_LOGIN_TRIES) {
        fail('बहुत ज़्यादा कोशिशें। कुछ देर बाद फिर कोशिश करें।', 429);
    }
    $st = $db->prepare('SELECT id, pin_hash FROM sellers WHERE phone = ?');
    $st->execute([$ph]);
    $s = $st->fetch();
    if (!$s || !password_verify($pin, $s['pin_hash'])) {
        $db->prepare('INSERT INTO login_attempts (phone, ip) VALUES (?,?)')->execute([$ph, $_SERVER['REMOTE_ADDR'] ?? '']);
        fail('फ़ोन नंबर या पिन ग़लत है', 401);
    }
    $db->prepare('DELETE FROM login_attempts WHERE phone = ?')->execute([$ph]);
    session_regenerate_id(true);
    $_SESSION['sid'] = (int) $s['id'];
    out(['ok' => true]);
}

function h_logout(array $i): never
{
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    session_destroy();
    out(['ok' => true]);
}

function h_product_add(array $i): never
{
    $sid = need_seller();
    $name = txt($i['name'] ?? '', 120);
    $price = (int) round((float) ($i['price'] ?? 0));
    $stock = max(1, min(100000, (int) ($i['stock'] ?? 1)));
    if ($name === '') {
        fail('सामान का नाम बताइए');
    }
    if ($price < 1 || $price > 10000000) {
        fail('दाम सिर्फ़ अंकों में बताइए');
    }
    $db = db();
    $db->prepare('INSERT INTO products (seller_id, name, price, stock, category, story, image) VALUES (?,?,?,?,?,?,?)')
       ->execute([$sid, $name, $price, $stock, txt($i['cat'] ?? '', 30), txt($i['story'] ?? '', 1000), save_image($i['image'] ?? '')]);
    out(['ok' => true, 'id' => (int) $db->lastInsertId()]);
}

function h_product_stock(array $i): never
{
    $sid = need_seller();
    $delta = max(-1000, min(1000, (int) ($i['delta'] ?? 0)));
    db()->prepare('UPDATE products SET stock = GREATEST(0, stock + ?) WHERE id = ? AND seller_id = ?')
        ->execute([$delta, (int) ($i['id'] ?? 0), $sid]);
    out(['ok' => true]);
}

function h_product_delete(array $i): never
{
    $sid = need_seller();
    $id = (int) ($i['id'] ?? 0);
    $db = db();
    $st = $db->prepare('SELECT image FROM products WHERE id = ? AND seller_id = ?');
    $st->execute([$id, $sid]);
    $p = $st->fetch();
    if ($p) {
        $db->prepare('DELETE FROM products WHERE id = ? AND seller_id = ?')->execute([$id, $sid]);
        if ($p['image'] !== '') {
            @unlink(UPLOAD_DIR . basename($p['image']));
        }
    }
    out(['ok' => true]);
}

function h_order_create(array $i): never
{
    $name = txt($i['name'] ?? '', 80);
    $ph = phone($i['phone'] ?? '');
    $addr = txt($i['addr'] ?? '', 300);
    $pay = ($i['pay'] ?? '') === 'UPI' ? 'UPI' : 'COD';
    if ($name === '' || $ph === '' || $addr === '') {
        fail('नाम, फ़ोन नंबर और पता भरें');
    }
    $want = [];                                   // product id => quantity (prices come from the DB, never from the browser)
    $items = is_array($i['items'] ?? null) ? $i['items'] : [];
    foreach ($items as $it) {
        if (!is_array($it)) {
            continue;
        }
        $pid = (int) ($it['pid'] ?? 0);
        $q = (int) ($it['q'] ?? 0);
        if ($pid > 0 && $q > 0) {
            $want[$pid] = min(100, ($want[$pid] ?? 0) + $q);
        }
    }
    if (!$want || count($want) > 50) {
        fail('कार्ट खाली है।');
    }
    ksort($want);                                 // same lock order for everyone → no deadlocks
    $tok = cust_token(true);
    $db = db();
    $db->beginTransaction();
    try {
        $sel = $db->prepare('SELECT id, seller_id, name, price, stock FROM products WHERE id = ? FOR UPDATE');
        $dec = $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        $ins = $db->prepare('INSERT INTO orders (product_id, seller_id, product_name, qty, total, customer_name,
                             customer_phone, customer_addr, pay_method, cust_token) VALUES (?,?,?,?,?,?,?,?,?,?)');
        foreach ($want as $pid => $q) {
            $sel->execute([$pid]);
            $p = $sel->fetch();
            if (!$p) {
                $db->rollBack();
                fail('सामान नहीं मिला', 404);
            }
            if ((int) $p['stock'] < $q) {
                $db->rollBack();
                fail($p['name'] . ' का स्टॉक कम है', 409);
            }
            $dec->execute([$q, $pid]);
            $ins->execute([$pid, $p['seller_id'], $p['name'], $q, (int) $p['price'] * $q, $name, $ph, $addr, $pay, $tok]);
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $e;
    }
    out(['ok' => true]);
}

function h_order_status(array $i): never
{
    $sid = need_seller();
    $status = $i['status'] ?? '';
    if (!in_array($status, ['new', 'packed', 'shipped', 'done'], true)) {
        fail('अमान्य अनुरोध');
    }
    db()->prepare('UPDATE orders SET status = ? WHERE id = ? AND seller_id = ?')
        ->execute([$status, (int) ($i['id'] ?? 0), $sid]);
    out(['ok' => true]);
}

function h_member_add(array $i): never
{
    $sid = need_seller();
    $name = txt($i['name'] ?? '', 60);
    if ($name !== '') {
        $db = db();
        $c = $db->prepare('SELECT COUNT(*) FROM members WHERE seller_id = ?');
        $c->execute([$sid]);
        if ((int) $c->fetchColumn() < 50) {
            $db->prepare('INSERT INTO members (seller_id, name) VALUES (?,?)')->execute([$sid, $name]);
        }
    }
    out(['ok' => true]);
}

function h_review_add(array $i): never
{
    $tok = cust_token();
    $pid = (int) ($i['pid'] ?? 0);
    $r = (int) ($i['r'] ?? 0);
    if ($tok === '' || $pid < 1 || $r < 1 || $r > 5) {
        fail('अमान्य अनुरोध');
    }
    $db = db();
    $st = $db->prepare("SELECT customer_name FROM orders WHERE product_id = ? AND cust_token = ? AND status = 'done' ORDER BY id DESC LIMIT 1");
    $st->execute([$pid, $tok]);
    $o = $st->fetch();
    if (!$o) {                                    // only people whose order was delivered can review
        fail('पहुँचे हुए ऑर्डर पर ही समीक्षा लिखी जा सकती है', 403);
    }
    $db->prepare('INSERT INTO reviews (product_id, rating, review_text, reviewer_name, cust_token) VALUES (?,?,?,?,?)
                  ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)')
       ->execute([$pid, $r, txt($i['t'] ?? '', 500), $o['customer_name'], $tok]);
    out(['ok' => true]);
}

function h_message_add(array $i): never
{
    $name = txt($i['name'] ?? '', 80);
    $msg = txt($i['message'] ?? '', 1000);
    if ($name === '' || $msg === '') {
        fail('नाम और संदेश भरें');
    }
    db()->prepare('INSERT INTO messages (name, message) VALUES (?,?)')->execute([$name, $msg]);
    out(['ok' => true]);
}

/* ---------- router ---------- */
$a = (string) ($_GET['a'] ?? '');
$isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
$gets = ['bootstrap' => 'h_bootstrap', 'my_orders' => 'h_my_orders', 'my_reviews' => 'h_my_reviews'];
$posts = [
    'register' => 'h_register', 'login' => 'h_login', 'logout' => 'h_logout',
    'product_add' => 'h_product_add', 'product_stock' => 'h_product_stock', 'product_delete' => 'h_product_delete',
    'order_create' => 'h_order_create', 'order_status' => 'h_order_status', 'member_add' => 'h_member_add',
    'review_add' => 'h_review_add', 'message_add' => 'h_message_add',
];

try {
    if (!$isPost && isset($gets[$a])) {
        $gets[$a]();
    }
    if ($isPost && isset($posts[$a])) {
        $posts[$a](body());
    }
    fail('अमान्य अनुरोध', 404);
} catch (Throwable $e) {
    error_log('[GramSakhi] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail('सर्वर में गड़बड़ी हुई। फिर कोशिश करें।', 500);
}
