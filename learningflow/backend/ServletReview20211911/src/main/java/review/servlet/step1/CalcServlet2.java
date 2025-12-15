package review.servlet.step1;

import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;


@WebServlet("/calc2.do")
public class CalcServlet2 extends HttpServlet {

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		
	}
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		String n1=request.getParameter("num1");
		String n2=request.getParameter("num2");
		String op=request.getParameter("operator");
		int result = Integer.parseInt(n1)+Integer.parseInt(n2);
		
		request.setAttribute("resultData", result);
		
		RequestDispatcher dispatcher=request.getRequestDispatcher("CalcResult.jsp");
		dispatcher.forward(request, response);

	}

}
