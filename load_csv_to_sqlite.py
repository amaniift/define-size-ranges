import pandas as pd
import sqlite3

def main():
    csv_file = 'item_master.csv'
    db_file = 'inventory.db'
    table_name = 'item_master'
    
    print(f"Loading data from {csv_file} into {db_file} (table {table_name})...")
    df = pd.read_csv(csv_file, low_memory=False)
    with sqlite3.connect(db_file) as conn:
        df.to_sql(table_name, conn, if_exists='replace', index=False)
    print("Successfully loaded data.")

if __name__ == "__main__":
    main()
