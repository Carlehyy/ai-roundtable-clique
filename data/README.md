# 数据备份说明

## 导出时间
2026-02-12 04:26 GMT+8

## 文件说明

### 1. 数据库文件
- **synapsemind.db** - SQLite数据库文件的完整备份 (72KB)

### 2. SQL备份
- **database_backup.sql** - 数据库的SQL dump文件,可用于恢复数据库 (31KB)

### 3. JSON格式数据

#### 完整数据
- **all_data.json** - 所有表的完整数据 (42KB)

#### 各表数据
- **llm_providers.json** - LLM提供商配置 (10条记录, 5.7KB)
- **sessions.json** - 讨论会话 (7条记录, 3.8KB)
- **session_llms.json** - 会话与LLM的关联 (18条记录, 2.4KB)
- **messages.json** - 讨论消息 (24条记录, 27KB)
- **consensus_points.json** - 共识点 (0条记录, 2B)

## 数据统计

| 表名 | 记录数 | 说明 |
|------|--------|------|
| llm_providers | 10 | LLM提供商配置(包含3个在线) |
| sessions | 7 | 讨论会话 |
| session_llms | 18 | 会话-LLM关联关系 |
| messages | 24 | AI讨论消息 |
| consensus_points | 0 | 共识点(暂无) |

## 如何恢复数据

### 方法1: 使用SQL文件恢复
```bash
sqlite3 backend/synapsemind.db < data/database_backup.sql
```

### 方法2: 直接使用数据库文件
```bash
cp data/synapsemind.db backend/synapsemind.db
```

### 方法3: 使用JSON数据
可以编写脚本读取JSON文件并插入到数据库中。

## 注意事项

⚠️ **安全提示**: 
- 数据库中包含API密钥等敏感信息
- 请勿将此数据公开分享
- 建议在私有仓库中保存

## 导出脚本

使用 `export_data.py` 脚本可以重新导出数据:
```bash
python3 export_data.py
```
