import pymysql
from pymysql import MySQLError
from dotenv import load_dotenv
import os

load_dotenv()

class Connection():
    def MysqlConnection(self):
        try:
            conn = pymysql.connect(
                host=os.getenv("DB_HOST"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME"),
                port=int(os.getenv("DB_PORT")),
                ssl_verify_cert=False,  # Disabled to allow self-signed certs
                ssl_verify_identity=False
            )
            cursor = conn.cursor()
            return conn, cursor
        except Exception as e:
            print(f"ERROR CONNECTING: {e}")
        return None, None
    def MysqlDisconnect(self, conn, cursor):
        try:
            if conn is not None:
                conn.commit()
            if cursor is not None:
                cursor.close()
            if conn is not None:
                conn.close()
        except Exception as e:
            print(f"ERROR: {e}")
        return None, None
