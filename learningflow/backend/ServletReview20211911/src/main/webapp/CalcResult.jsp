<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>계산서비스 응답화면</title>
</head>
<body>
<h1> 요청하신 계산 결과: <%= request.getAttribute("resultData") %>   입니다.</h1>
<h1> (EL로 표시) 요청하신 계산 결과: ${resultData}   입니다.</h1>
</body>
</html>