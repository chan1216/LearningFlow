<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>계산 서비스 요청</title>
</head>
<body>

<h1> 계산 서비스 </h1>
<form action="calc2.do" method="post">
	숫자1: <input type="text" name="num1"> 
	<select name="operator">
		<option>+</option>
		<option>-</option>
		<option>*</option>
		<option>/</option>
	</select>
	숫자2: <input type="text" name="num2"> 
	=
	<input type="submit"> 
</form>
</body>
</html>