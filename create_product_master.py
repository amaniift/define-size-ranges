import sqlite3
import pandas as pd

def main():
    db_file = 'inventory.db'
    
    # Using REPLACE to remove the '.0' that pandas adds to integer columns containing nulls
    query = """
    CREATE TABLE product_master AS
    SELECT DISTINCT
        REPLACE(IFNULL(CAST(ITEM_PARENT AS TEXT), ''), '.0', '') || '_' || IFNULL(DIFF_1, '') AS parent_diff_1,
        DIFF_2,
        DIFF_2_DESC,
        REPLACE(CAST(ITEM_PARENT AS TEXT), '.0', '') AS ITEM_PARENT,
        SUBCLASS,
        CLASS,
        DEPT
    FROM item_master;
    """
    
    with sqlite3.connect(db_file) as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS product_master;")
        cursor.execute(query)
        conn.commit()
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM product_master;")
        count = cursor.fetchone()[0]
        print(f"Successfully created product_master with {count} rows.")
        
        # Let's also print top 5 rows to verify it looks correct
        df_top = pd.read_sql_query("SELECT * FROM product_master LIMIT 5;", conn)
        print("\nTop 5 rows of product_master:")
        print(df_top.to_string())

if __name__ == "__main__":
    main()
