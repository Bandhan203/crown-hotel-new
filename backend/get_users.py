import sqlite3

c = sqlite3.connect('db.sqlite3')
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
print("Tables:", tables)

try:
    users = c.execute("SELECT email, role, is_superuser FROM accounts_customuser").fetchall()
    print("Users:", users)
except Exception as e:
    print(e)

try:
    users2 = c.execute("SELECT email, is_superuser FROM auth_user").fetchall()
    print("Auth Users:", users2)
except Exception as e:
    pass

try:
    users3 = c.execute("SELECT email FROM accounts_user").fetchall()
    print("Accounts Users:", users3)
except Exception as e:
    pass
