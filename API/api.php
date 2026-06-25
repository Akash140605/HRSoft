<?php
declare(strict_types=1);

require_once __DIR__ . "/cors.php";
require_once __DIR__ . "/database.php";

function respond(int $status, bool $success, $data = null, string $error = "", array $extra = []): void {
    http_response_code($status);
    $payload = ["success" => $success];
    if ($success) $payload["data"] = $data;
    else $payload["error"] = $error;
    echo json_encode(array_merge($payload, $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function ok($data = null, int $status = 200, array $extra = []): void {
    respond($status, true, $data, "", $extra);
}

function fail(string $message, int $status = 400, array $extra = []): void {
    respond($status, false, null, $message, $extra);
}

function fetchAllAssoc(mysqli_result $result): array {
    $rows = [];
    while ($row = $result->fetch_assoc()) $rows[] = $row;
    return $rows;
}

function bindParams(mysqli_stmt $stmt, string $types, array &$values): void {
    $refs = [$types];
    foreach ($values as $k => &$v) $refs[] = &$v;
    call_user_func_array([$stmt, 'bind_param'], $refs);
}

function readJsonBody(): array {
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) fail("Invalid JSON body", 400);
    return $data;
}

function normalizeString($value): string {
    return trim((string)$value);
}

function normalizeEmployeeRow(array $e): array {
    return [
        "id" => $e["id"] ?? null,
        "code" => normalizeString($e["code"] ?? ''),
        "name" => $e["name"] ?? '',
        "designation" => $e["designation"] ?? '',
        "week_off" => $e["week_off"] ?? 'Sunday',
        "shift" => $e["shift"] ?? 'A',
        "hall_id" => $e["hall_id"] ?? '',
        "hall_name" => $e["hall_name"] ?? ''
    ];
}

function normalizeRosterRow(array $e): array {
    return [
        "id" => $e["id"] ?? null,
        "week_key" => $e["week_key"] ?? '',
        "week_start" => $e["week_start"] ?? '',
        "week_end" => $e["week_end"] ?? '',
        "code" => normalizeString($e["code"] ?? ''),
        "name" => $e["name"] ?? '',
        "designation" => $e["designation"] ?? '',
        "week_off" => $e["week_off"] ?? 'Sunday',
        "shift" => $e["shift"] ?? 'A',
        "hall_id" => $e["hall_id"] ?? '',
        "hall_name" => $e["hall_name"] ?? '',
        "created_at" => $e["created_at"] ?? ''
    ];
}

function normalizeEntryRow(array $e): array {
    return [
        "id" => $e["id"] ?? null,
        "code" => normalizeString($e["code"] ?? ''),
        "name" => $e["name"] ?? '',
        "designation" => $e["designation"] ?? '',
        "week_off" => $e["week_off"] ?? 'Sunday',
        "shift" => $e["shift"] ?? 'A',
        "hall_id" => $e["hall_id"] ?? '',
        "hall_name" => $e["hall_name"] ?? '',
        "source" => $e["source"] ?? 'SCAN',
        "hr_code" => $e["hr_code"] ?? '',
        "hr_action" => $e["hr_action"] ?? '',
        "override_reason" => $e["override_reason"] ?? '',
        "date" => $e["date"] ?? '',
        "time" => $e["time"] ?? '',
        "day" => $e["day"] ?? ''
    ];
}

function normalizeLogRow(array $l): array {
    return [
        "id" => $l["id"] ?? null,
        "type" => $l["type"] ?? '',
        "message" => $l["message"] ?? '',
        "performedBy" => $l["performedBy"] ?? '',
        "employeeCode" => $l["employeeCode"] ?? '',
        "hallId" => $l["hallId"] ?? '',
        "hallName" => $l["hallName"] ?? '',
        "overrideReason" => $l["overrideReason"] ?? '',
        "at" => $l["at"] ?? ''
    ];
}

function insertLog(
    mysqli $conn,
    string $type,
    string $message,
    string $performedBy = '',
    string $employeeCode = '',
    string $hallId = '',
    string $hallName = '',
    string $overrideReason = ''
): int {
    $stmt = $conn->prepare("INSERT INTO logs (type, message, performedBy, employeeCode, hallId, hallName, overrideReason) VALUES (?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) throw new RuntimeException($conn->error);
    $stmt->bind_param("sssssss", $type, $message, $performedBy, $employeeCode, $hallId, $hallName, $overrideReason);
    if (!$stmt->execute()) throw new RuntimeException($stmt->error);
    $id = (int)$stmt->insert_id;
    $stmt->close();
    return $id;
}

function weekRangeFromKey(string $weekKey): array {
    if (preg_match('/^(\d{4})-W(\d{2})$/', $weekKey, $m)) {
        $dt = (new DateTimeImmutable())->setISODate((int)$m[1], (int)$m[2], 1)->setTime(0, 0, 0);
        return [$dt->format('Y-m-d'), $dt->modify('+6 days')->format('Y-m-d')];
    }
    $fallback = new DateTimeImmutable('monday this week');
    return [$fallback->format('Y-m-d'), $fallback->modify('+6 days')->format('Y-m-d')];
}

function currentWeekKey(): string {
    return (new DateTimeImmutable())->format('o-\WW');
}

function normalizeEmployeesPayload($payload): array {
    return is_array($payload) ? $payload : [];
}

try {
    $db = new Database();
    $conn = $db->getConnection();

    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $endpoint = isset($_GET["endpoint"]) ? trim((string)$_GET["endpoint"], "/") : "";
    if ($endpoint === "") fail("Endpoint required. Use ?endpoint=employees", 400);

    $parts = explode("/", $endpoint);
    $resource = $parts[0] ?? "";
    $param1 = $parts[1] ?? null;

    if ($method === "GET") {
        switch ($resource) {
            case "employees":
                if ($param1) {
                    $stmt = $conn->prepare("SELECT * FROM employees WHERE code = ? LIMIT 1");
                    if (!$stmt) fail($conn->error, 500);
                    $stmt->bind_param("s", $param1);
                    $stmt->execute();
                    $row = $stmt->get_result()->fetch_assoc();
                    if (!$row) fail("Employee not found", 404);
                    ok(normalizeEmployeeRow($row));
                    break;
                }
                $result = $conn->query("SELECT * FROM employees ORDER BY id DESC");
                if (!$result) fail($conn->error, 500);
                ok(array_map("normalizeEmployeeRow", fetchAllAssoc($result)));
                break;

            case "roster":
                $weekKey = normalizeString($_GET["week_key"] ?? currentWeekKey());
                $hallId = normalizeString($_GET["hall_id"] ?? "");
                $query = "SELECT * FROM weekly_rosters WHERE week_key = ?";
                $types = "s";
                $params = [$weekKey];
                if ($hallId !== "") {
                    $query .= " AND hall_id = ?";
                    $types .= "s";
                    $params[] = $hallId;
                }
                $query .= " ORDER BY hall_id, name";
                $stmt = $conn->prepare($query);
                if (!$stmt) fail($conn->error, 500);
                bindParams($stmt, $types, $params);
                $stmt->execute();
                ok(array_map("normalizeRosterRow", fetchAllAssoc($stmt->get_result())));
                break;

 case "attendance":

    $code = normalizeString($param1 ?? ($_GET["code"] ?? ""));

    if ($code === "") {

        $result = $conn->query("
            SELECT *
            FROM entries
            ORDER BY id DESC
        ");

        if (!$result) fail($conn->error, 500);

        ok(array_map(
            "normalizeEntryRow",
            fetchAllAssoc($result)
        ));

        break;
    }

    $stmt = $conn->prepare("
        SELECT *
        FROM entries
        WHERE code = ?
        ORDER BY id DESC
    ");

    if (!$stmt) fail($conn->error, 500);

    $stmt->bind_param("s", $code);
    $stmt->execute();

    ok(array_map(
        "normalizeEntryRow",
        fetchAllAssoc($stmt->get_result())
    ));

    break;

            case "halls":
                $result = $conn->query("SELECT * FROM halls ORDER BY id");
                if (!$result) fail($conn->error, 500);
                ok(fetchAllAssoc($result));
                break;

            case "entries":
                if ($param1 === "count") {
                    $result = $conn->query("SELECT COUNT(*) AS total FROM entries");
                    if (!$result) fail($conn->error, 500);
                    $row = $result->fetch_assoc();
                    ok(["total" => (int)($row["total"] ?? 0)]);
                    break;
                }

                $date = $_GET["date"] ?? null;
                $shift = $_GET["shift"] ?? null;
                $hall_id = $_GET["hall_id"] ?? null;
                $query = "SELECT * FROM entries WHERE 1=1";
                $types = "";
                $params = [];
                if ($date) { $query .= " AND date = ?"; $types .= "s"; $params[] = $date; }
                if ($shift) { $query .= " AND shift = ?"; $types .= "s"; $params[] = $shift; }
                if ($hall_id) { $query .= " AND hall_id = ?"; $types .= "s"; $params[] = $hall_id; }
                $query .= " ORDER BY id DESC";
                $stmt = $conn->prepare($query);
                if (!$stmt) fail($conn->error, 500);
                if (!empty($params)) bindParams($stmt, $types, $params);
                $stmt->execute();
                ok(array_map("normalizeEntryRow", fetchAllAssoc($stmt->get_result())));
                break;

            case "logs":
                $result = $conn->query("SELECT * FROM logs ORDER BY `at` DESC LIMIT 1000");
                if (!$result) fail($conn->error, 500);
                ok(array_map("normalizeLogRow", fetchAllAssoc($result)));
                break;

            default:
                fail("Invalid endpoint: " . $resource, 404);
        }
    }

    if ($method === "POST") {
        $data = readJsonBody();

        switch ($resource) {
            case "employees":
                if ($param1 === "bulk-import") {
                    $employees = normalizeEmployeesPayload($data["employees"] ?? $data["rows"] ?? $data["data"] ?? null);
                    if (!is_array($employees)) fail("Valid employees array required", 400);

                    $stmt = $conn->prepare("
                        INSERT INTO employees (code, name, designation, week_off, shift, hall_id, hall_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name),
                            designation = VALUES(designation),
                            week_off = VALUES(week_off),
                            shift = VALUES(shift),
                            hall_id = VALUES(hall_id),
                            hall_name = VALUES(hall_name)
                    ");
                    if (!$stmt) fail($conn->error, 500);

                    $conn->begin_transaction();
                    try {
                        $imported = 0;
                        foreach ($employees as $emp) {
                            if (!is_array($emp)) continue;
                            $code = normalizeString($emp["code"] ?? "");
                            $name = normalizeString($emp["name"] ?? "");
                            if ($code === "" || $name === "") continue;

                            $designation = normalizeString($emp["designation"] ?? "");
                            $week_off = normalizeString($emp["week_off"] ?? $emp["weekOff"] ?? "Sunday");
                            $shift = normalizeString($emp["shift"] ?? "A");
                            $hall_id = normalizeString($emp["hallId"] ?? $emp["hall_id"] ?? "");
                            $hall_name = normalizeString($emp["hallName"] ?? $emp["hall_name"] ?? "");

                            $stmt->bind_param("sssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name);
                            if ($stmt->execute()) $imported++;
                        }
                        $conn->commit();
                        ok(["imported" => $imported]);
                    } catch (Throwable $e) {
                        $conn->rollback();
                        fail($e->getMessage(), 500);
                    }
                    break;
                }

                $code = normalizeString($data["code"] ?? "");
                $name = normalizeString($data["name"] ?? "");
                if ($code === "" || $name === "") fail("Code and name required", 400);
                $designation = normalizeString($data["designation"] ?? "");
                $week_off = normalizeString($data["week_off"] ?? "Sunday");
                $shift = normalizeString($data["shift"] ?? "A");
                $hall_id = normalizeString($data["hall_id"] ?? "");
                $hall_name = normalizeString($data["hall_name"] ?? "");

                $stmt = $conn->prepare("INSERT INTO employees (code, name, designation, week_off, shift, hall_id, hall_name) VALUES (?, ?, ?, ?, ?, ?, ?)");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("sssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $stmt->insert_id], 201);
                break;

            case "roster":
                if ($param1 === "import-prev") {
                    $targetWeek = normalizeString($data["week_key"] ?? currentWeekKey());
                    $sourceWeek = normalizeString($data["source_week_key"] ?? "");
                    if ($sourceWeek === "") $sourceWeek = (new DateTimeImmutable())->modify("-7 days")->format('o-\WW');
                    [$weekStart, $weekEnd] = weekRangeFromKey($targetWeek);

                    $stmt = $conn->prepare("
                        INSERT INTO weekly_rosters (week_key, week_start, week_end, code, name, designation, week_off, shift, hall_id, hall_name)
                        SELECT ?, ?, ?, code, name, designation, week_off, shift, hall_id, hall_name
                        FROM weekly_rosters
                        WHERE week_key = ?
                        ON DUPLICATE KEY UPDATE
                            week_start = VALUES(week_start),
                            week_end = VALUES(week_end),
                            name = VALUES(name),
                            designation = VALUES(designation),
                            week_off = VALUES(week_off),
                            shift = VALUES(shift),
                            hall_id = VALUES(hall_id),
                            hall_name = VALUES(hall_name)
                    ");
                    if (!$stmt) fail($conn->error, 500);
                    $stmt->bind_param("ssss", $targetWeek, $weekStart, $weekEnd, $sourceWeek);
                    if (!$stmt->execute()) fail($stmt->error, 500);
                    ok(["week_key" => $targetWeek, "source_week_key" => $sourceWeek, "affected" => $stmt->affected_rows]);
                    break;
                }

                $weekKey = normalizeString($data["week_key"] ?? currentWeekKey());
                [$weekStart, $weekEnd] = weekRangeFromKey($weekKey);
                $employees = normalizeEmployeesPayload($data["employees"] ?? $data["rows"] ?? $data["data"] ?? null);
                if (!is_array($employees)) fail("Valid employees array required", 400);

                $stmt = $conn->prepare("
                    INSERT INTO weekly_rosters
                    (week_key, week_start, week_end, code, name, designation, week_off, shift, hall_id, hall_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        week_start = VALUES(week_start),
                        week_end = VALUES(week_end),
                        name = VALUES(name),
                        designation = VALUES(designation),
                        week_off = VALUES(week_off),
                        shift = VALUES(shift),
                        hall_id = VALUES(hall_id),
                        hall_name = VALUES(hall_name)
                ");
                if (!$stmt) fail($conn->error, 500);

                $conn->begin_transaction();
                try {
                    $imported = 0;
                    foreach ($employees as $emp) {
                        if (!is_array($emp)) continue;
                        $code = normalizeString($emp["code"] ?? "");
                        $name = normalizeString($emp["name"] ?? "");
                        if ($code === "" || $name === "") continue;

                        $designation = normalizeString($emp["designation"] ?? "");
                        $week_off = normalizeString($emp["week_off"] ?? $emp["weekOff"] ?? "Sunday");
                        $shift = normalizeString($emp["shift"] ?? "A");
                        $hall_id = normalizeString($emp["hallId"] ?? $emp["hall_id"] ?? "");
                        $hall_name = normalizeString($emp["hallName"] ?? $emp["hall_name"] ?? "");

                        $stmt->bind_param("ssssssssss", $weekKey, $weekStart, $weekEnd, $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name);
                        if ($stmt->execute()) $imported++;
                    }
                    $conn->commit();
                    ok(["week_key" => $weekKey, "imported" => $imported], 201);
                } catch (Throwable $e) {
                    $conn->rollback();
                    fail($e->getMessage(), 500);
                }
                break;

            case "halls":
                $id = normalizeString($data["id"] ?? "");
                $name = normalizeString($data["name"] ?? "");
                if ($id === "" || $name === "") fail("ID and name required", 400);
                $capacity = (int)($data["capacity"] ?? 50);
                $color = normalizeString($data["color"] ?? "blue");
                $stmt = $conn->prepare("INSERT INTO halls (id, name, capacity, color) VALUES (?, ?, ?, ?)");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("ssis", $id, $name, $capacity, $color);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "name" => $name, "capacity" => $capacity, "color" => $color], 201);
                break;

            case "entries":
                $code = normalizeString($data["code"] ?? "");
                $name = normalizeString($data["name"] ?? "");
                if ($code === "" || $name === "") fail("Code and name required", 400);
                $designation = normalizeString($data["designation"] ?? "");
                $week_off = normalizeString($data["week_off"] ?? "Sunday");
                $shift = normalizeString($data["shift"] ?? "A");
                $hall_id = normalizeString($data["hall_id"] ?? "");
                $hall_name = normalizeString($data["hall_name"] ?? "");
                $source = normalizeString($data["source"] ?? "SCAN");
                $hr_code = normalizeString($data["hr_code"] ?? "");
                $hr_action = normalizeString($data["hr_action"] ?? "");
                $override_reason = normalizeString($data["override_reason"] ?? "");
                $now = new DateTime();
                $date = $now->format("Y-m-d");
                $time = $now->format("H:i:s");
                $day = $now->format("l");

                $stmt = $conn->prepare("INSERT INTO entries (code, name, designation, week_off, shift, hall_id, hall_name, source, hr_code, hr_action, override_reason, date, time, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("ssssssssssssss", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $source, $hr_code, $hr_action, $override_reason, $date, $time, $day);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $stmt->insert_id], 201);
                break;

            case "logs":
                $type = normalizeString($data["type"] ?? "");
                $message = normalizeString($data["message"] ?? "");
                if ($type === "" || $message === "") fail("Type and message required", 400);
                $performedBy = normalizeString($data["performedBy"] ?? $data["by"] ?? $data["hrCode"] ?? $data["hr_code"] ?? "");
                $employeeCode = normalizeString($data["employeeCode"] ?? $data["employee_code"] ?? $data["code"] ?? "");
                $hallId = normalizeString($data["hallId"] ?? $data["hall_id"] ?? "");
                $hallName = normalizeString($data["hallName"] ?? $data["hall_name"] ?? "");
                $overrideReason = normalizeString($data["overrideReason"] ?? $data["override_reason"] ?? $data["reason"] ?? "");
                $stmt = $conn->prepare("INSERT INTO logs (type, message, performedBy, employeeCode, hallId, hallName, overrideReason) VALUES (?, ?, ?, ?, ?, ?, ?)");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("sssssss", $type, $message, $performedBy, $employeeCode, $hallId, $hallName, $overrideReason);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $stmt->insert_id], 201);
                break;

            default:
                fail("Invalid endpoint: " . $resource, 404);
        }
    }

    if ($method === "PUT") {
        $data = readJsonBody();

        switch ($resource) {
            case "employees":
                if (!$param1) fail("Employee ID required", 400);
                $id = (int)$param1;
                $code = normalizeString($data["code"] ?? "");
                $name = normalizeString($data["name"] ?? "");
                if ($code === "" || $name === "") fail("Code and name required", 400);
                $designation = normalizeString($data["designation"] ?? "");
                $week_off = normalizeString($data["week_off"] ?? "Sunday");
                $shift = normalizeString($data["shift"] ?? "A");
                $hall_id = normalizeString($data["hall_id"] ?? "");
                $hall_name = normalizeString($data["hall_name"] ?? "");
                $stmt = $conn->prepare("UPDATE employees SET code=?, name=?, designation=?, week_off=?, shift=?, hall_id=?, hall_name=? WHERE id=?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("sssssssi", $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "code" => $code, "name" => $name]);
                break;

            case "roster":
                if (!$param1) fail("Roster ID required", 400);
                $id = (int)$param1;
                $weekKey = normalizeString($data["week_key"] ?? currentWeekKey());
                [$weekStart, $weekEnd] = weekRangeFromKey($weekKey);
                $code = normalizeString($data["code"] ?? "");
                $name = normalizeString($data["name"] ?? "");
                if ($code === "" || $name === "") fail("Code and name required", 400);
                $designation = normalizeString($data["designation"] ?? "");
                $week_off = normalizeString($data["week_off"] ?? "Sunday");
                $shift = normalizeString($data["shift"] ?? "A");
                $hall_id = normalizeString($data["hall_id"] ?? "");
                $hall_name = normalizeString($data["hall_name"] ?? "");
                $stmt = $conn->prepare("UPDATE weekly_rosters SET week_key=?, week_start=?, week_end=?, code=?, name=?, designation=?, week_off=?, shift=?, hall_id=?, hall_name=? WHERE id=?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("ssssssssssi", $weekKey, $weekStart, $weekEnd, $code, $name, $designation, $week_off, $shift, $hall_id, $hall_name, $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "week_key" => $weekKey, "code" => $code, "name" => $name]);
                break;

            case "halls":
                if (!$param1) fail("Hall ID required", 400);
                $id = (string)$param1;
                $name = normalizeString($data["name"] ?? "");
                if ($name === "") fail("Name required", 400);
                $capacity = (int)($data["capacity"] ?? 50);
                $color = normalizeString($data["color"] ?? "blue");
                $stmt = $conn->prepare("UPDATE halls SET name=?, capacity=?, color=? WHERE id=?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("siss", $name, $capacity, $color, $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "name" => $name, "capacity" => $capacity, "color" => $color]);
                break;

            default:
                fail("Invalid endpoint: " . $resource, 404);
        }
    }

    if ($method === "DELETE") {
        switch ($resource) {
            case "employees":
                if (!$param1) fail("Employee ID required", 400);
                $id = (int)$param1;
                $stmt = $conn->prepare("DELETE FROM employees WHERE id = ?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("i", $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "deleted" => $stmt->affected_rows]);
                break;

            case "roster":
                if ($param1 === "all") {
                    $weekKey = normalizeString($_GET["week_key"] ?? "");
                    if ($weekKey !== "") {
                        $stmt = $conn->prepare("DELETE FROM weekly_rosters WHERE week_key = ?");
                        if (!$stmt) fail($conn->error, 500);
                        $stmt->bind_param("s", $weekKey);
                        if (!$stmt->execute()) fail($stmt->error, 500);
                        ok(["deletedAll" => true, "week_key" => $weekKey, "deleted" => $stmt->affected_rows]);
                    }

                    if (!$conn->query("DELETE FROM weekly_rosters")) fail($conn->error, 500);
                    ok(["deletedAll" => true, "deleted" => $conn->affected_rows]);
                }

                if (!$param1) fail("Roster ID required", 400);
                $id = (int)$param1;
                $stmt = $conn->prepare("DELETE FROM weekly_rosters WHERE id = ?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("i", $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "deleted" => $stmt->affected_rows]);
                break;

            case "halls":
                if (!$param1) fail("Hall ID required", 400);
                $id = (string)$param1;
                $stmt = $conn->prepare("DELETE FROM halls WHERE id = ?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("s", $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "deleted" => $stmt->affected_rows]);
                break;

            case "entries":
                if ($param1 === "all") {
                    if (!$conn->query("DELETE FROM entries")) fail($conn->error, 500);
                    ok(["deletedAll" => true, "deleted" => $conn->affected_rows]);
                }

                if (!$param1) fail("Entry ID required", 400);
                $id = (int)$param1;
                $stmt = $conn->prepare("DELETE FROM entries WHERE id = ?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("i", $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "deleted" => $stmt->affected_rows]);
                break;

            case "logs":
                if (!$param1) fail("Log ID required", 400);
                $id = (int)$param1;
                $stmt = $conn->prepare("DELETE FROM logs WHERE id = ?");
                if (!$stmt) fail($conn->error, 500);
                $stmt->bind_param("i", $id);
                if (!$stmt->execute()) fail($stmt->error, 500);
                ok(["id" => $id, "deleted" => $stmt->affected_rows]);
                break;

            default:
                fail("Invalid endpoint: " . $resource, 404);
        }
    }

    fail("Invalid request method: " . $method, 405);
} finally {
    $db->closeConnection();
}