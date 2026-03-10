<?php
// goodnight/api/config/database.php
// Connexion PDO à la base de données MySQL "goodnight"

class Database {
    private static ?PDO $instance = null;

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $host   = 'localhost';
            $dbname = 'goodnight';
            $user   = 'root';   // utilisateur phpMyAdmin par défaut XAMPP
            $pass   = '';       // mot de passe XAMPP (vide par défaut)

            self::$instance = new PDO(
                "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
                $user,
                $pass,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        }
        return self::$instance;
    }
}
