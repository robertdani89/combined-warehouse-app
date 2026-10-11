<?php
//echo "started";
$t = strftime('%m-%d %H:%M', time());

$key = "YOUR_KEY_HERE";

$registrationID = $argv[1];
$message = $argv[2];

// Debug log lives next to this script. Using __DIR__ (instead of a bare relative
// path) makes the location independent of whatever working directory IIS/php-cgi
// invokes the script with; writes are also error-suppressed so a logging failure
// never breaks the actual push notification request.
function debugLog($line) {
  $path = __DIR__ . DIRECTORY_SEPARATOR . "dubugFireBaseNot.txt";
  @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
}

debugLog($t . " started " . $registrationID . " " . $message . "\n");

// $message looks like a JSON-ish payload, e.g. '{t:f,s:1}', but is NOT valid JSON:
// keys and string values aren't quoted, so json_decode() silently returns null for
// it. Parse this loose "{key:value,...}" shape by hand instead, while still
// accepting real JSON input so stricter callers keep working too. "t" is the task
// state (u = free/unassigned task, f = a task was assigned to this user, anything
// else = an existing task was changed); the priority is read from either "a" or
// "s" (seen in practice), whichever is present.
function parseLooseTaskPayload($raw) {
  $decoded = json_decode($raw, true);
  if (is_array($decoded)) {
    return $decoded;
  }

  $trimmed = trim($raw);
  if ($trimmed === '' || $trimmed[0] !== '{' || substr($trimmed, -1) !== '}') {
    return null;
  }

  $inner = substr($trimmed, 1, -1);
  if (trim($inner) === '') {
    return array();
  }

  $result = array();
  foreach (explode(',', $inner) as $pair) {
    $parts = explode(':', $pair, 2);
    if (count($parts) !== 2) {
      continue;
    }
    $key = trim($parts[0], " \t\n\r\0\x0B\"'");
    $value = trim($parts[1], " \t\n\r\0\x0B\"'");
    if ($key !== '') {
      $result[$key] = $value;
    }
  }
  return $result;
}

$payload = parseLooseTaskPayload($message);
$taskState = is_array($payload) && isset($payload['t']) ? $payload['t'] : null;
$priorityValue = is_array($payload) ? (isset($payload['a']) ? $payload['a'] : (isset($payload['s']) ? $payload['s'] : null)) : null;

if ($taskState === 'u') {
  $title = "Szabad feladat";
  $body = "Új szabad feladat érhető el.";
} elseif ($taskState === 'f') {
  $title = "Új feladat";
  $body = "Új feladatot kaptál.";
} else {
  $title = "Feladat modosult";
  $body = "Változás történt egy feladatban.";
}

$pushPriority = ($priorityValue !== null && (int)$priorityValue >= 1) ? "high" : "default";
$pushData = is_array($payload) ? $payload : array("data" => $message);

sleep(1);

// The app now registers Expo push tokens (format "ExponentPushToken[...]") instead of
// raw FCM registration ids, since Google retired the legacy FCM HTTP API this script
// originally targeted. Route Expo tokens through Expo's push service, and keep the old
// FCM legacy call as a fallback for any pre-existing native tokens still stored in the DB.
$isExpoToken = strpos($registrationID, "ExponentPushToken") === 0 || strpos($registrationID, "ExpoPushToken") === 0;

$curl = curl_init();

if ($isExpoToken) {
  $postFields = json_encode(array(
    "to" => $registrationID,
    "title" => $title,
    "body" => $body,
    "priority" => $pushPriority,
    "data" => $pushData,
  ));

  curl_setopt_array($curl, array(
    CURLOPT_SSL_VERIFYHOST => 0,
    CURLOPT_SSL_VERIFYPEER => 0,
    CURLOPT_URL => "https://exp.host/--/api/v2/push/send",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => "",
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => array(
      "Accept: application/json",
      "Accept-Encoding: gzip, deflate",
      "Cache-Control: no-cache",
      "Content-Type: application/json"
    ),
  ));
} else {
  $postFields = json_encode(array(
    "to" => $registrationID,
    "android" => array("priority" => $pushPriority),
    "notification" => array("title" => $title, "body" => $body),
    "data" => $pushData,
  ));

  curl_setopt_array($curl, array(
    CURLOPT_SSL_VERIFYHOST => 0,
    CURLOPT_SSL_VERIFYPEER => 0,
    CURLOPT_URL => "https://fcm.googleapis.com/fcm/send",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => "",
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_HTTPHEADER => array(
      "Authorization: key=" . $key,
      "Content-Type: application/json"
    ),
  ));
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => array(
      "Authorization: key=",
      "Cache-Control: no-cache",
      "Content-Type: application/json"
    ),
  ));
}

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  debugLog($t . ":cURL Error #:" . $err . "\n");
  echo $t . ":cURL Error #:" . $err;
} else {
  debugLog($t . ":response:" . $response . "\n");
}

//file_put_contents("dubug.txt", $result . "\n", FILE_APPEND | LOCK_EX);*/
?>