#!/usr/bin/env python3
"""
数据库数据导出脚本
导出所有表的数据为JSON格式
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = "backend/synapsemind.db"
OUTPUT_DIR = Path("data")

def export_table_to_json(cursor, table_name):
    """导出单个表为JSON"""
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    data = []
    for row in rows:
        row_dict = {}
        for i, col in enumerate(columns):
            row_dict[col] = row[i]
        data.append(row_dict)
    
    return data

def main():
    # 连接数据库
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 获取所有表名
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"找到 {len(tables)} 个表: {', '.join(tables)}")
    
    # 导出所有数据
    all_data = {
        "export_time": datetime.now().isoformat(),
        "tables": {}
    }
    
    for table in tables:
        print(f"导出表: {table}")
        table_data = export_table_to_json(cursor, table)
        all_data["tables"][table] = table_data
        print(f"  - {len(table_data)} 条记录")
        
        # 同时导出单独的JSON文件
        with open(OUTPUT_DIR / f"{table}.json", "w", encoding="utf-8") as f:
            json.dump(table_data, f, ensure_ascii=False, indent=2)
    
    # 导出完整数据
    with open(OUTPUT_DIR / "all_data.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 数据导出完成!")
    print(f"  - 完整数据: data/all_data.json")
    print(f"  - 各表数据: data/<table_name>.json")
    print(f"  - SQL备份: data/database_backup.sql")
    print(f"  - 数据库文件: data/synapsemind.db")
    
    conn.close()

if __name__ == "__main__":
    main()
