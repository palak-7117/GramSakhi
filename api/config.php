<?php
// GramSakhi – settings. XAMPP default: user "root" with an empty password.
// If you set a MySQL password in XAMPP, put it in DB_PASS.
const DB_HOST = '127.0.0.1';
const DB_NAME = 'gramsakhi';
const DB_USER = 'root';
const DB_PASS = '';

const UPLOAD_DIR = __DIR__ . '/../uploads/';   // where product photos are saved
const UPLOAD_URL = 'uploads/';                 // how the browser reaches them
const MAX_LOGIN_TRIES = 8;                     // wrong PINs allowed per phone per 15 minutes
