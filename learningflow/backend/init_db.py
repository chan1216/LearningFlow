"""데이터베이스 초기화 스크립트"""
import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# MySQL 연결 정보
mysql_user = os.getenv('MYSQL_USER', 'root')
mysql_password = os.getenv('MYSQL_PASSWORD', '')
mysql_host = os.getenv('MYSQL_HOST', 'localhost')
mysql_port = int(os.getenv('MYSQL_PORT', '3306'))
mysql_database = os.getenv('MYSQL_DATABASE', 'learningflow')

try:
    # MySQL 서버에 연결 (데이터베이스 없이)
    connection = pymysql.connect(
        host=mysql_host,
        port=mysql_port,
        user=mysql_user,
        password=mysql_password
    )
    
    cursor = connection.cursor()
    
    # 데이터베이스 생성
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {mysql_database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    print(f"✅ 데이터베이스 '{mysql_database}' 생성 완료")
    
    cursor.close()
    connection.close()
    
    print("\n이제 Flask 서버를 실행하면 자동으로 테이블이 생성됩니다.")
    print("명령: py -3.12 app.py")
    
except pymysql.err.OperationalError as e:
    print(f"❌ MySQL 연결 실패: {e}")
    print("\n다음을 확인해주세요:")
    print("1. MySQL 서버가 실행 중인지 확인")
    print("2. .env 파일의 MYSQL_PASSWORD가 올바른지 확인")
    print("3. MySQL 사용자 권한이 있는지 확인")
except Exception as e:
    print(f"❌ 오류 발생: {e}")
