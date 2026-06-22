<?php
// database.php - MySQL Database Configuration for HR System

class Database {
    private $host = "localhost";
    private $db_name = "hrsystem_db";
    private $username = "root";
    private $password = "";
    public $conn;
    public $error;

    // Get database connection
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new mysqli($this->host, $this->username, $this->password, $this->db_name);
            
            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            
            $this->conn->set_charset("utf8");
        } catch (Exception $exception) {
            $this->error = $exception->getMessage();
            return null;
        }

        return $this->conn;
    }

    // Close connection
    public function closeConnection() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// For direct usage:
// $db = new Database();
// $conn = $db->getConnection();
// if (!$conn) { die("Database connection failed: " . $db->error); }
// ... use $conn for queries ...
// $db->closeConnection();
?>