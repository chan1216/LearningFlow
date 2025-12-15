package review.servlet.step1;

import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;


@WebServlet("/calc.do")
public class CalcServlet extends HttpServlet {

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		
	}
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String n1=request.getParameter("num1");
		String n2=request.getParameter("num2");
		String op=request.getParameter("operator");
		int result = Integer.parseInt(n1)+Integer.parseInt(n2);
		System.out.println("계산결과 : "+result);
		
		response.setContentType("text/html; charset=UTF-8");
		PrintWriter out = response.getWriter();
		out.println("<HTML>");
		out.println("<HEAD><TITLE>계산기</TITLE></HEAD>");
		out.println("<BODY>");
		out.println("<h1> 서블릿으로 만든 페이지 </h1>");
		out.println("<H4> 요청하신 결과값은  " + result  + "입니다.</H4>");
		out.println("<HR>");
		out.println("</BODY></HTML>");	
	}

}
