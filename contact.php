<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

// ---- Configuration ----
$recipient = 'ziani@maghrebcolor.com';
$fromAddress = 'no-reply@maghrebcolor.com'; // should match your domain to avoid spam filtering

// ---- Helpers ----
function clean_field(?string $value): string {
    $value = trim($value ?? '');
    $value = str_replace(["\r", "\n"], ' ', $value); // prevent header injection
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function clean_text(?string $value): string {
    // Multi-line message: keep line breaks, strip everything else risky
    $value = trim($value ?? '');
    $value = str_replace("\r", '', $value);
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function respond(bool $ok, int $status, ?string $error = null): void {
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'error' => $error]);
    exit;
}

// ---- Method check ----
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 405, 'method_not_allowed');
}

// ---- Honeypot spam check ----
// Real visitors never fill this hidden field; bots often do.
if (!empty($_POST['website'])) {
    respond(true, 200); // pretend success so bots don't retry
}

// ---- Read & sanitize fields ----
$name    = clean_field($_POST['name'] ?? '');
$phone   = clean_field($_POST['phone'] ?? '');
$service = clean_field($_POST['service'] ?? '');
$message = clean_text($_POST['message'] ?? '');

// Optional customer email: only kept if it is a valid single address
$emailRaw = trim(str_replace(["\r", "\n"], '', (string)($_POST['email'] ?? '')));
$email = ($emailRaw !== '' && filter_var($emailRaw, FILTER_VALIDATE_EMAIL)) ? $emailRaw : '';
if ($emailRaw !== '' && $email === '') {
    respond(false, 400, 'invalid_email');
}

// ---- Required field validation ----
if ($name === '' || $phone === '') {
    respond(false, 400, 'missing_fields');
}

// Basic length guard against abuse
if (strlen($name) > 200 || strlen($phone) > 50 || strlen($email) > 200 || strlen($message) > 5000) {
    respond(false, 400, 'field_too_long');
}

// ---- Compose email ----
$subject = 'Nouvelle demande de devis - ' . html_entity_decode($name, ENT_QUOTES, 'UTF-8');
$body  = "Nouvelle demande reçue depuis maghrebcolor.com\n\n";
$body .= "Nom : {$name}\n";
$body .= "Téléphone : {$phone}\n";
$body .= "E-mail : " . ($email !== '' ? $email : 'Non renseigné') . "\n";
$body .= "Produit : " . ($service !== '' ? $service : 'Non précisé') . "\n\n";
$body .= "Message :\n" . ($message !== '' ? $message : '(aucun message)') . "\n";
if ($email !== '') {
    $body .= "\n— Répondez directement à cet e-mail pour écrire au client.\n";
} else {
    $body .= "\n— Pas d'e-mail fourni : rappelez le client au {$phone}.\n";
}
$body = html_entity_decode($body, ENT_QUOTES, 'UTF-8'); // plain-text email: show real characters

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$headers  = "From: Maghreb Color <{$fromAddress}>\r\n";
$headers .= "Reply-To: " . ($email !== '' ? $email : $fromAddress) . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// ---- Send ----
$sent = @mail($recipient, $encodedSubject, $body, $headers, '-f' . $fromAddress);

if ($sent) {
    respond(true, 200);
} else {
    respond(false, 500, 'send_failed');
}
