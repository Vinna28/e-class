<?php
require_once("config.php");

$namaPengguna = $sandi = "";
$namaPengguna_err = $sandi_err = "";

if($_SERVER["REQUEST_METHOD"] == "POST") {

	// CEK JIKA USER KOSONG
	if (empty(trim($_POST["namaPengguna"]))) {
		$username_err = "Masukkan nama pengguna.";
	} else {
		$username = trim($_POST["namaPengguna"]);
	}

	// CEK JIKA SANDI KOSONG
	if (empty(trim($_POST["sandi"]))) {
		$sandi_err = "Masuk sandi.";
	} else {
		$sandi = trim($_POST["sandi"]);
	}

}

// if(isset($_POST['login'])) {
// 	$nama = filter_input(INPUT_POST, 'nama', FILTER_SANITIZE_STRING);
// 	$password = filter_input(INPUT_POST, 'password', FILTER_SANITIZE_STRING);

// 	$sql = "SELECT * FROM user WHERE namaPengguna=:nama";

}

?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="ie=edge">
	<title>SRUPUT</title>
</head>
<body>
	<form action="home.php">
		<div class="container">
			<label for="uname"><b>Username</b></label>
			<input type="text" placeholder="Nama pengguna" name="uname" required>

			<label for="psw"><b>Kata Sandi</b></label>
			<input type="password" placeholder="Sandi" name="psw" required>

			<button type="submit">Masuk</button>
			<label><input type="checkbox" checked="checked" name="remember">Ingat saya</label>
		</div>
	</form>
</body>
</html>
