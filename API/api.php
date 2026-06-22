<?php
// api.php - HR System API with designation support
// PHP + MySQL

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control: Allow-Origin: *");
header("Access-Control: Allow-Methods: Get, Post, Put, Delete");

include_once "database.php";

class HrApi {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
        
        if (!$this->conn) {
            echo json_encode(["success" => false, "error" => "Database connection failed"]);
            exit;
        }
    }

    // ==================== EMPLOYEES ====================

    public function getEmployees() {
        $query = "SELECT * FROM employees ORDER BY created_at DESC";
        $result = $this->conn->query($query);
        
        $employees = [];
        while ($row = $result->fetch_assoc()) {
            $employees[] = $row;
        }

        echo json_encode(["success" => true, "data" => $employees]);
    }

    public function getEmployeeByCode($code) {
        $query = "SELECT * FROM employees WHERE code = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            echo json_encode(["success" => false, "error" => "Employee not found"]);
            return;
        }

        $employee = $result->fetch_assoc();
        echo json_encode(["success" => true, "data" => $employee]);
    }

    public function addEmployee() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->code) || !isset($data->name)) {
            echo json_encode(["success" => false, "error" => "Code and name required"]);
            return;
        }

        $code = $data->code;
        $name = $data->name;
        $designation = isset($data->designation) ? $data->designation : "";
        $week_off = isset($data->week_off) ? $data->week_off : "Sunday";
        $shift = isset($data->shift) ? $data->shift : "A";
        $hall_id = isset($data->hall_id) ? $data->hall_id : "H1";
        $hall_name = isset($data->hall_name) ? $data->hall_name : "Hall 1";

        $query = "INSERT INTO employees (code, name, designation, week_off, shift, hall_id, hall_name) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name);
        $stmt->execute();

        echo json_encode(["success" => true, "data" => ["id" => $stmt->insert_id, "code" => $code, "name" => $name, "designation" => $designation]]);
    }

    public function updateEmployee($id) {
        $data = json_decode(file_get_contents("php://input"));

        $code = $data->code;
        $name = $data->name;
        $designation = isset($data->designation) ? $data->designation : "";
        $week_off = isset($data->week_off) ? $data->week_off : "Sunday";
        $shift = isset($data->shift) ? $data->shift : "A";
        $hall_id = isset($data->hall_id) ? $data->hall_id : "H1";
        $hall_name = isset($data->hall_name) ? $data->hall_name : "Hall 1";

        $query = "UPDATE employees SET code = ?, name = ?, designation = ?, week_off = ?, shift = ?, hall_id = ?, hall_name = ? WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sssssssi", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $id);
        $stmt->execute();

        echo json_encode(["success" => true, "data" => ["id" => $id, "code" => $code, "name" => $name, "designation" => $designation]]);
    }

    public function deleteEmployee($id) {
        $query = "DELETE FROM employees WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    public function bulkImportEmployees() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->employees) || !is_array($data->employees)) {
            echo json_encode(["success" => false, "error" => "Valid employees array required"]);
            return;
        }

        $employees = $data->employees;
        $imported = 0;

        foreach ($employees as $emp) {
            $code = $emp->code;
            $name = $emp->name;
            $designation = isset($emp->designation) ? $emp->designation : "";
            $week_off = isset($emp->week_off) ? $emp->week_off : "Sunday";
            $shift = isset($emp->shift) ? $emp->shift : "A";
            $hall_id = isset($emp->hallId) ? $emp->hallId : "H1";
            $hall_name = isset($emp->hallName) ? $emp->hallName : "Hall 1";

            $query = "INSERT INTO employees (code, name, designation, week_off, shift, hall_id, hall_name) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, designation = ?, week_off = ?, shift = ?, hall_id = ?, hall_name = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("ssssssssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $name, $designation, $week_off, $shift, $hall_id, $hall_name);
            $stmt->execute();
            $imported++;
        }

        echo json_encode(["success" => true, "imported" => $imported]);
    }

    // ==================== HALLS ====================

    public function getHalls() {
        $query = "SELECT * FROM halls ORDER BY id";
        $result = $this->conn->query($query);
        
        $halls = [];
        while ($row = $result->fetch_assoc()) {
            $halls[] = $row;
        }

        echo json_encode(["success" => true, "data" => $halls]);
    }

    public function addHall() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id) || !isset($data->name)) {
            echo json_encode(["success" => false, "error" => "ID and name required"]);
            return;
        }

        $id = $data->id;
        $name = $data->name;
        $capacity = isset($data->capacity) ? $data->capacity : 50;
        $color = isset($data->color) ? $data->color : "blue";

        $query = "INSERT INTO halls (id, name, capacity, color) VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sis", $id, $name, $capacity, $color);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    public function updateHall($id) {
        $data = json_decode(file_get_contents("php://input"));

        $name = $data->name;
        $capacity = isset($data->capacity) ? $data->capacity : 50;
        $color = isset($data->color) ? $data->color : "blue";

        $query = "UPDATE halls SET name = ?, capacity = ?, color = ? WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sis", $name, $capacity, $color, $id);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    public function deleteHall($id) {
        $query = "DELETE FROM halls WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $id);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    // ==================== ENTRIES ====================

    public function getEntriesByDate($date) {
        $query = "SELECT * FROM entries WHERE date = ? ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $date);
        $stmt->execute();
        $result = $stmt->get_result();

        $entries = [];
        while ($row = $result->fetch_assoc()) {
            $entries[] = $row;
        }

        echo json_encode(["success" => true, "data" => $entries]);
    }

    public function getEntries() {
        $date = isset($_GET["date"]) ? $_GET["date"] : null;
        $shift = isset($_GET["shift"]) ? $_GET["shift"] : null;
        $hall_id = isset($_GET["hall_id"]) ? $_GET["hall_id"] : null;

        $query = "SELECT * FROM entries WHERE 1=1";
        
        if ($date) {
            $query .= " AND date = ?";
        }
        if ($shift) {
            $query .= " AND shift = ?";
        }
        if ($hall_id) {
            $query .= " AND hall_id = ?";
        }

        $stmt = $this->conn->prepare($query);
        
        if ($date || $shift || $hall_id) {
            $types = "";
            $params = [];
            
            if ($date) {
                $types .= "s";
                $params[] = $date;
            }
            if ($shift) {
                $types .= "s";
                $params[] = $shift;
            }
            if ($hall_id) {
                $types .= "s";
                $params[] = $hall_id;
            }
            
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();

        $entries = [];
        while ($row = $result->fetch_assoc()) {
            $entries[] = $row;
        }

        echo json_encode(["success" => true, "data" => $entries]);
    }

    public function addEntry() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->code) || !isset($data->name)) {
            echo json_encode(["success" => false, "error" => "Code and name required"]);
            return;
        }

        $code = $data->code;
        $name = $data->name;
        $designation = isset($data->designation) ? $data->designation : "";
        $week_off = isset($data->week_off) ? $data->week_off : "Sunday";
        $shift = isset($data->shift) ? $data->shift : "A";
        $hall_id = isset($data->hall_id) ? $data->hall_id : "H1";
        $hall_name = isset($data->hall_name) ? $data->hall_name : "Hall 1";
        $source = isset($data->source) ? $data->source : "SCAN";
        $hr_code = isset($data->hr_code) ? $data->hr_code : "";
        $hr_action = isset($data->hr_action) ? $data->hr_action : "";
        $override_reason = isset($data->override_reason) ? $data->override_reason : "";

        $now = new DateTime();
        $date = $now->format("Y-m-d");
        $time = $now->format("H:i:s");
        $day = $now->format("l");

        $query = "INSERT INTO entries (code, name, designation, week_off, shift, hall_id, hall_name, source, hr_code, hr_action, override_reason, date, time, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("ssssssssssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $source, $hr_code, $hr_action, $override_reason, $date, $time, $day);
        $stmt->execute();

        echo json_encode(["success" => true, "data" => ["id" => $stmt->insert_id, "code" => $code, "name" => $name, "designation" => $designation, "hall_name" => $hall_name]]);
    }

    public function deleteEntry($id) {
        $query = "DELETE FROM entries WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    // ==================== LOGS ====================

    public function getLogs() {
        $type = isset($_GET["type"]) ? $_GET["type"] : null;
        $employee_code = isset($_GET["employee_code"]) ? $_GET["employee_code"] : null;

        $query = "SELECT * FROM logs WHERE 1=1";
        
        if ($type) {
            $query .= " AND type = ?";
        }
        if ($employee_code) {
            $query .= " AND employee_code = ?";
        }

        $query .= " ORDER BY `at` DESC LIMIT 1000";
        
        $stmt = $this->conn->prepare($query);
        
        if ($type || $employee_code) {
            $types = "";
            $params = [];
            
            if ($type) {
                $types .= "s";
                $params[] = $type;
            }
            if ($employee_code) {
                $types .= "s";
                $params[] = $employee_code;
            }
            
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();

        $logs = [];
        while ($row = $result->fetch_assoc()) {
            // Note: backticks in column name access
            $logs[] = $row;
        }

        echo json_encode(["success" => true, "data" => $logs]);
    }

    public function addLog() {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->type) || !isset($data->message)) {
            echo json_encode(["success" => false, "error" => "Type and message required"]);
            return;
        }

        $type = $data->type;
        $message = $data->message;
        $by = isset($data->by) ? $data->by : "";
        $employee_code = isset($data->employee_code) ? $data->employee_code : "";
        $hall_id = isset($data->hall_id) ? $data->hall_id : "";
        $hall_name = isset($data->hall_name) ? $data->hall_name : "";
        $override_reason = isset($data->override_reason) ? $data->override_reason : "";

        $query = "INSERT INTO logs (type, message, `by`, employee_code, hall_id, hall_name, override_reason) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("sssssss", $type, $message, $by, $employee_code, $hall_id, $hall_name, $override_reason);
        $stmt->execute();

        echo json_encode(["success" => true]);
    }

    // ==================== ATTENDANCE ====================

    public function getAttendance($code) {
        $query = "SELECT DISTINCT date FROM entries WHERE code = ? ORDER BY date DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();

        $presentDays = $result->num_rows;
        $absentDays = max(0, 30 - $presentDays);
        $lastSeen = "";

        if ($row = $result->fetch_assoc()) {
            $lastSeen = $row["date"];
        }

        echo json_encode(["success" => true, "data" => ["code" => $code, "presentDays" => $presentDays, "absentDays" => $absentDays, "lastSeen" => $lastSeen, "totalRecords" => $presentDays]]);
    }

    public function getAllAttendance() {
        $query = "SELECT * FROM employees";
        $result = $this->conn->query($query);
        
        $attendanceData = [];
        while ($emp = $result->fetch_assoc()) {
            $query2 = "SELECT DISTINCT date FROM entries WHERE code = ? ORDER BY date DESC";
            $stmt = $this->conn->prepare($query2);
            $stmt->bind_param("s", $emp["code"]);
            $stmt->execute();
            $result2 = $stmt->get_result();

            $presentDays = $result2->num_rows;
            $absentDays = max(0, 30 - $presentDays);
            $lastSeen = "";

            if ($row = $result2->fetch_assoc()) {
                $lastSeen = $row["date"];
            }

            $attendanceData[] = [
                ...$emp,
                "presentDays" => $presentDays,
                "absentDays" => $absentDays,
                "lastSeen" => $lastSeen,
                "totalRecords" => $presentDays
            ];
        }

        echo json_encode(["success" => true, "data" => $attendanceData]);
    }
}

// Route handling
$api = new HrApi();
$method = $_SERVER["REQUEST_METHOD"];
$endpoint = isset($_GET["endpoint"]) ? $_GET["endpoint"] : "";
$request = explode("/", trim($endpoint, "/"));

if ($method === "GET") {
    switch ($request[0]) {
        case "employees":
            if (isset($request[1])) {
                $api->getEmployeeByCode($request[1]);
            } else {
                $api->getEmployees();
            }
            break;
        case "halls":
            $api->getHalls();
            break;
        case "entries":
            if (isset($request[1]) && $request[1] !== "") {
                $api->getEntriesByDate($request[1]);
            } else {
                $api->getEntries();
            }
            break;
        case "logs":
            $api->getLogs();
            break;
        case "attendance":
            if (isset($request[1])) {
                $api->getAttendance($request[1]);
            } else {
                $api->getAllAttendance();
            }
            break;
        default:
            echo json_encode(["success" => false, "error" => "Invalid endpoint"]);
    }
} elseif ($method === "POST") {
    switch ($request[0]) {
        case "employees":
            if (isset($request[1]) && $request[1] === "bulk-import") {
                $api->bulkImportEmployees();
            } else {
                $api->addEmployee();
            }
            break;
        case "halls":
            $api->addHall();
            break;
        case "entries":
            $api->addEntry();
            break;
        case "logs":
            $api->addLog();
            break;
        default:
            echo json_encode(["success" => false, "error" => "Invalid endpoint"]);
    }
} elseif ($method === "PUT") {
    switch ($request[0]) {
        case "employees":
            if (isset($request[1])) {
                $api->updateEmployee($request[1]);
            } else {
                echo json_encode(["success" => false, "error" => "Employee ID required"]);
            }
            break;
        case "halls":
            if (isset($request[1])) {
                $api->updateHall($request[1]);
            } else {
                echo json_encode(["success" => false, "error" => "Hall ID required"]);
            }
            break;
        default:
            echo json_encode(["success" => false, "error" => "Invalid endpoint"]);
    }
} elseif ($method === "DELETE") {
    switch ($request[0]) {
        case "employees":
            if (isset($request[1])) {
                $api->deleteEmployee($request[1]);
            } else {
                echo json_encode(["success" => false, "error" => "Employee ID required"]);
            }
            break;
        case "halls":
            if (isset($request[1])) {
                $api->deleteHall($request[1]);
            } else {
                echo json_encode(["success" => false, "error" => "Hall ID required"]);
            }
            break;
        case "entries":
            if (isset($request[1])) {
                $api->deleteEntry($request[1]);
            } else {
                echo json_encode(["success" => false, "error" => "Entry ID required"]);
            }
            break;
        default:
            echo json_encode(["success" => false, "error" => "Invalid endpoint"]);
    }
} else {
    echo json_encode(["success" => false, "error" => "Invalid request method"]);
}
?>