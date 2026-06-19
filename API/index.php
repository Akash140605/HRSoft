<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require_once __DIR__ . '/../config/database.php';

function jsonInput(): array {
  $data = json_decode(file_get_contents('php://input'), true);
  return is_array($data) ? $data : [];
}

function respond(bool $success, string $message = '', $data = null, int $status = 200): void {
  http_response_code($status);
  echo json_encode([
    'success' => $success,
    'message' => $message,
    'data' => $data
  ]);
  exit;
}

function seedDefaults(PDO $pdo): void {
  $count = (int)$pdo->query("SELECT COUNT(*) AS c FROM halls")->fetch()['c'];
  if ($count === 0) {
    $stmt = $pdo->prepare("INSERT INTO halls (id, name, capacity, color) VALUES (?, ?, ?, ?)");
    $defaults = [
      ['H1', 'Hall 1', 50, 'teal'],
      ['H2', 'Hall 2', 50, 'blue'],
      ['H3', 'Hall 3', 50, 'violet'],
      ['H4', 'Hall 4', 50, 'amber'],
    ];
    foreach ($defaults as $row) {
      $stmt->execute($row);
    }
  }

  $count = (int)$pdo->query("SELECT COUNT(*) AS c FROM employees")->fetch()['c'];
  if ($count === 0) {
    $stmt = $pdo->prepare("INSERT INTO employees (name, code, week_off, shift) VALUES (?, ?, ?, ?)");
    $defaults = [
      ['Employee 1', '1001', 'Sunday', 'A'],
      ['Employee 2', '1002', 'Sunday', 'B'],
    ];
    foreach ($defaults as $row) {
      $stmt->execute($row);
    }
  }
}

function getDayNameFromDate(string $dateStr): string {
  return date('l', strtotime($dateStr));
}

function getShiftMeta(string $shiftCode): ?array {
  $shifts = [
    'A' => ['start' => '06:00', 'end' => '14:00', 'label' => 'Shift A'],
    'B' => ['start' => '14:00', 'end' => '22:00', 'label' => 'Shift B'],
    'C' => ['start' => '22:00', 'end' => '06:00', 'label' => 'Shift C'],
    'AA' => ['start' => '08:00', 'end' => '20:00', 'label' => 'Shift AA'],
    'BB' => ['start' => '20:00', 'end' => '08:00', 'label' => 'Shift BB'],
  ];
  return $shifts[$shiftCode] ?? null;
}

function isTimeInShift(string $timeHHMM, string $shiftCode): bool {
  $shift = getShiftMeta($shiftCode);
  if (!$shift) return true;

  [$h, $m] = array_map('intval', explode(':', $timeHHMM));
  $current = $h * 60 + $m;
  [$sh, $sm] = array_map('intval', explode(':', $shift['start']));
  [$eh, $em] = array_map('intval', explode(':', $shift['end']));
  $start = $sh * 60 + $sm;
  $end = $eh * 60 + $em;

  if ($shiftCode === 'C' || $shiftCode === 'BB') {
    return $current >= $start || $current < $end;
  }

  return $current >= $start && $current < $end;
}

function getTotalCapacity(PDO $pdo): int {
  $stmt = $pdo->query("SELECT COALESCE(SUM(capacity), 0) AS total_capacity FROM halls");
  return (int)$stmt->fetch()['total_capacity'];
}

function getTodayEntriesCount(PDO $pdo, string $entryDate): int {
  $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE entry_date = ?");
  $stmt->execute([$entryDate]);
  return (int)$stmt->fetch()['c'];
}

function getNextAvailableHall(PDO $pdo, string $entryDate): ?array {
  $stmt = $pdo->prepare("SELECT * FROM halls ORDER BY id ASC");
  $stmt->execute();
  $halls = $stmt->fetchAll();

  foreach ($halls as $hall) {
    $usedStmt = $pdo->prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE entry_date = ? AND hall_id = ?");
    $usedStmt->execute([$entryDate, $hall['id']]);
    $used = (int)$usedStmt->fetch()['c'];
    if ($used < (int)$hall['capacity']) return $hall;
  }

  return null;
}

function allHallsFull(PDO $pdo, string $entryDate): bool {
  return getTodayEntriesCount($pdo, $entryDate) >= getTotalCapacity($pdo);
}

seedDefaults($pdo);

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/');
$scriptBase = trim(dirname($_SERVER['SCRIPT_NAME']), '/');
if ($scriptBase && str_starts_with($path, $scriptBase)) {
  $path = trim(substr($path, strlen($scriptBase)), '/');
}

$segments = $path === '' ? [] : explode('/', $path);
$resource = $segments[0] ?? 'health';
$action = $segments[1] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

if ($resource === 'health') {
  respond(true, 'API is running', ['time' => date('c')]);
}

if ($resource === 'settings' && $method === 'GET') {
  $stmt = $pdo->prepare("SELECT `value` FROM settings WHERE `key` = 'current_user_role'");
  $stmt->execute();
  $row = $stmt->fetch();
  respond(true, 'ok', ['current_user_role' => $row['value'] ?? 'HR']);
}

if ($resource === 'settings' && $method === 'PUT') {
  $input = jsonInput();
  $role = strtoupper(trim((string)($input['current_user_role'] ?? 'HR')));
  $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES ('current_user_role', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
  $stmt->execute([$role]);
  respond(true, 'Role updated', ['current_user_role' => $role]);
}

if ($resource === 'employees') {
  if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM employees ORDER BY id DESC");
    respond(true, 'ok', $stmt->fetchAll());
  }

  if ($method === 'POST') {
    $input = jsonInput();
    $name = trim((string)($input['name'] ?? ''));
    $code = trim((string)($input['code'] ?? ''));
    $weekOff = trim((string)($input['weekOff'] ?? 'Sunday'));
    $shift = trim((string)($input['shift'] ?? 'A'));

    if ($name === '' || $code === '') respond(false, 'Name and code are required', null, 422);

    $stmt = $pdo->prepare("INSERT INTO employees (name, code, week_off, shift) VALUES (?, ?, ?, ?)");
    try {
      $stmt->execute([$name, $code, $weekOff, $shift]);
      respond(true, 'Employee added', ['id' => (int)$pdo->lastInsertId()], 201);
    } catch (PDOException $e) {
      respond(false, 'Code already exists', null, 409);
    }
  }

  if ($method === 'PUT' && $action) {
    $id = (int)$action;
    $input = jsonInput();
    $name = trim((string)($input['name'] ?? ''));
    $code = trim((string)($input['code'] ?? ''));
    $weekOff = trim((string)($input['weekOff'] ?? 'Sunday'));
    $shift = trim((string)($input['shift'] ?? 'A'));

    if ($name === '' || $code === '') respond(false, 'Name and code are required', null, 422);

    $stmt = $pdo->prepare("UPDATE employees SET name = ?, code = ?, week_off = ?, shift = ? WHERE id = ?");
    $stmt->execute([$name, $code, $weekOff, $shift, $id]);
    respond(true, 'Employee updated');
  }

  if ($method === 'DELETE' && $action) {
    $id = (int)$action;
    $stmt = $pdo->prepare("DELETE FROM employees WHERE id = ?");
    $stmt->execute([$id]);
    respond(true, 'Employee deleted');
  }
}

if ($resource === 'halls') {
  if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM halls ORDER BY id ASC");
    respond(true, 'ok', $stmt->fetchAll());
  }

  if ($method === 'POST') {
    $input = jsonInput();
    $id = trim((string)($input['id'] ?? ''));
    $name = trim((string)($input['name'] ?? ''));
    $capacity = (int)($input['capacity'] ?? 0);
    $color = trim((string)($input['color'] ?? 'slate'));

    if ($id === '' || $name === '') respond(false, 'Hall id and name required', null, 422);

    $stmt = $pdo->prepare("INSERT INTO halls (id, name, capacity, color) VALUES (?, ?, ?, ?)");
    try {
      $stmt->execute([$id, $name, $capacity, $color]);
      respond(true, 'Hall added', null, 201);
    } catch (PDOException $e) {
      respond(false, 'Hall id already exists', null, 409);
    }
  }

  if ($method === 'PUT' && $action) {
    $id = $action;
    $input = jsonInput();
    $name = trim((string)($input['name'] ?? ''));
    $capacity = (int)($input['capacity'] ?? 0);
    $color = trim((string)($input['color'] ?? 'slate'));

    if ($name === '') respond(false, 'Hall name required', null, 422);

    $stmt = $pdo->prepare("UPDATE halls SET name = ?, capacity = ?, color = ? WHERE id = ?");
    $stmt->execute([$name, $capacity, $color, $id]);
    respond(true, 'Hall updated');
  }

  if ($method === 'DELETE' && $action) {
    $id = $action;
    $usedStmt = $pdo->prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE hall_id = ?");
    $usedStmt->execute([$id]);
    if ((int)$usedStmt->fetch()['c'] > 0) {
      respond(false, 'Hall has entries, delete blocked', null, 409);
    }

    $stmt = $pdo->prepare("DELETE FROM halls WHERE id = ?");
    $stmt->execute([$id]);
    respond(true, 'Hall deleted');
  }
}

if ($resource === 'attendance') {
  if ($method === 'GET') {
    $date = $_GET['date'] ?? null;
    if ($date) {
      $stmt = $pdo->prepare("SELECT * FROM attendance_entries WHERE entry_date = ? ORDER BY id DESC");
      $stmt->execute([$date]);
    } else {
      $stmt = $pdo->query("SELECT * FROM attendance_entries ORDER BY id DESC");
    }
    respond(true, 'ok', $stmt->fetchAll());
  }

  if ($method === 'POST') {
    $input = jsonInput();
    $code = trim((string)($input['code'] ?? ''));
    $selectedDate = trim((string)($input['selectedDate'] ?? date('Y-m-d')));
    $source = trim((string)($input['source'] ?? 'SCAN_OR_MANUAL'));

    if ($code === '') respond(false, 'Code is required', null, 422);

    $stmt = $pdo->prepare("SELECT * FROM employees WHERE code = ?");
    $stmt->execute([$code]);
    $employee = $stmt->fetch();

    if (!$employee && $source !== 'HR_OVERRIDE') {
      respond(false, 'Employee code not found', null, 404);
    }

    if ($source !== 'HR_OVERRIDE') {
      $already = $pdo->prepare("SELECT COUNT(*) AS c FROM attendance_entries WHERE code = ? AND entry_date = ?");
      $already->execute([$code, $selectedDate]);
      if ((int)$already->fetch()['c'] > 0) respond(false, 'Punch already exists for this date', null, 409);

      $currentHHMM = date('H:i');
      if ($employee && !isTimeInShift($currentHHMM, $employee['shift'])) {
        respond(false, 'Current time is outside assigned shift', ['canOverride' => true], 422);
      }

      if ($employee && $employee['week_off'] === getDayNameFromDate($selectedDate)) {
        respond(false, 'Today is week off', ['canOverride' => true], 422);
      }

      if (allHallsFull($pdo, $selectedDate)) {
        respond(false, 'All halls are full', null, 409);
      }
    }

    $hall = getNextAvailableHall($pdo, $selectedDate);
    $now = new DateTime();
    $entryTime = $now->format('H:i:s');
    $day = getDayNameFromDate($selectedDate);

    $name = trim((string)($input['name'] ?? ($employee['name'] ?? '')));
    $weekOff = trim((string)($input['weekOff'] ?? ($employee['week_off'] ?? '-')));
    $shift = trim((string)($input['shift'] ?? ($employee['shift'] ?? '-')));
    $hallId = $input['hallId'] ?? ($hall['id'] ?? null);
    $hallName = $input['hallName'] ?? ($hall['name'] ?? 'Unnamed Hall');
    $overrideReason = trim((string)($input['overrideReason'] ?? ''));
    $overriddenBy = trim((string)($input['overriddenBy'] ?? 'HR'));

    $insert = $pdo->prepare("
      INSERT INTO attendance_entries
      (employee_id, code, name, week_off, shift, hall_id, hall_name, status, source, override_reason, overridden_by, day, time, entry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    try {
      $insert->execute([
        $employee['id'] ?? null,
        $code,
        $name,
        $weekOff,
        $shift,
        $hallId,
        $hallName,
        'Present',
        $source,
        $source === 'HR_OVERRIDE' ? $overrideReason : null,
        $source === 'HR_OVERRIDE' ? $overriddenBy : null,
        $day,
        $entryTime,
        $selectedDate
      ]);
    } catch (PDOException $e) {
      if (str_contains($e->getMessage(), 'uq_code_date')) {
        respond(false, 'Punch already exists for this date', null, 409);
      }
      respond(false, 'Unable to save attendance', null, 500);
    }

    $entryId = (int)$pdo->lastInsertId();
    $logMsg = $source === 'HR_OVERRIDE'
      ? "OVERRIDE: {$name} -> {$overrideReason}"
      : "{$name} -> {$hallName}";

    $log = $pdo->prepare("INSERT INTO activity_logs (message, created_at, related_entry_id) VALUES (?, ?, ?)");
    $log->execute([$logMsg, $now->format('Y-m-d H:i:s'), $entryId]);

    respond(true, 'Attendance saved', [
      'id' => $entryId,
      'code' => $code,
      'name' => $name,
      'hallName' => $hallName,
      'source' => $source
    ], 201);
  }

  if ($method === 'DELETE' && $action) {
    $id = (int)$action;
    $stmt = $pdo->prepare("DELETE FROM attendance_entries WHERE id = ?");
    $stmt->execute([$id]);
    respond(true, 'Attendance removed');
  }
}

if ($resource === 'logs' && $method === 'GET') {
  $stmt = $pdo->query("SELECT * FROM activity_logs ORDER BY id DESC LIMIT 100");
  respond(true, 'ok', $stmt->fetchAll());
}

respond(false, 'Route not found', null, 404);