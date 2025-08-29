-- 添加复合索引以优化查询性能

-- 用户相关索引
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
CREATE INDEX "users_lastLogin_idx" ON "users"("lastLogin");

-- 工作流相关索引
CREATE INDEX "workflows_userId_status_idx" ON "workflows"("userId", "status");
CREATE INDEX "workflows_isTemplate_status_idx" ON "workflows"("isTemplate", "status");
CREATE INDEX "workflows_category_status_idx" ON "workflows"("category", "status");
CREATE INDEX "workflows_tags_idx" ON "workflows" USING GIN ("tags");

-- 工作流步骤索引
CREATE INDEX "workflow_steps_workflowId_order_idx" ON "workflow_steps"("workflowId", "order");
CREATE INDEX "workflow_steps_stepType_idx" ON "workflow_steps"("stepType");
CREATE INDEX "workflow_steps_isRequired_idx" ON "workflow_steps"("isRequired");

-- 执行记录索引
CREATE INDEX "executions_userId_status_idx" ON "executions"("userId", "status");
CREATE INDEX "executions_workflowId_status_idx" ON "executions"("workflowId", "status");
CREATE INDEX "executions_status_priority_idx" ON "executions"("status", "priority");
CREATE INDEX "executions_dueDate_idx" ON "executions"("dueDate");
CREATE INDEX "executions_tags_idx" ON "executions" USING GIN ("tags");
CREATE INDEX "executions_progress_idx" ON "executions"("progress");

-- 执行步骤记录索引
CREATE INDEX "execution_records_executionId_status_idx" ON "execution_records"("executionId", "status");
CREATE INDEX "execution_records_stepId_status_idx" ON "execution_records"("stepId", "status");
CREATE INDEX "execution_records_completedAt_idx" ON "execution_records"("completedAt");

-- 附件索引
CREATE INDEX "attachments_fileType_uploadedAt_idx" ON "attachments"("fileType", "uploadedAt");
CREATE INDEX "attachments_tags_idx" ON "attachments" USING GIN ("tags");
CREATE INDEX "attachments_fileSize_idx" ON "attachments"("fileSize");

-- 复盘记录索引
CREATE INDEX "reviews_userId_rating_idx" ON "reviews"("userId", "rating");
CREATE INDEX "reviews_rating_createdAt_idx" ON "reviews"("rating", "createdAt");
CREATE INDEX "reviews_tags_idx" ON "reviews" USING GIN ("tags");
CREATE INDEX "reviews_isPublic_idx" ON "reviews"("isPublic");

-- 系统日志索引
CREATE INDEX "system_logs_userId_action_idx" ON "system_logs"("userId", "action");
CREATE INDEX "system_logs_resource_resourceId_idx" ON "system_logs"("resource", "resourceId");
CREATE INDEX "system_logs_action_createdAt_idx" ON "system_logs"("action", "createdAt");

-- 全文搜索索引（PostgreSQL特有）
-- 为工作流名称和描述创建全文搜索索引
ALTER TABLE "workflows" ADD COLUMN "search_vector" tsvector;
CREATE INDEX "workflows_search_idx" ON "workflows" USING GIN ("search_vector");

-- 创建触发器来自动更新搜索向量
CREATE OR REPLACE FUNCTION update_workflow_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('chinese', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "workflows"
  FOR EACH ROW EXECUTE FUNCTION update_workflow_search_vector();

-- 为现有数据更新搜索向量
UPDATE "workflows" SET search_vector = to_tsvector('chinese', COALESCE(name, '') || ' ' || COALESCE(description, ''));

-- 为复盘内容创建全文搜索索引
ALTER TABLE "reviews" ADD COLUMN "search_vector" tsvector;
CREATE INDEX "reviews_search_idx" ON "reviews" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION update_review_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('chinese', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.content, '') || ' ' || 
    COALESCE(NEW.lessons, '') || ' ' || 
    COALESCE(NEW.improvements, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION update_review_search_vector();

-- 为现有复盘数据更新搜索向量
UPDATE "reviews" SET search_vector = to_tsvector('chinese', 
  COALESCE(title, '') || ' ' || 
  COALESCE(content, '') || ' ' || 
  COALESCE(lessons, '') || ' ' || 
  COALESCE(improvements, '')
);

-- 创建分区表（如果数据量很大）
-- 为系统日志按月分区
-- CREATE TABLE "system_logs_y2024m12" PARTITION OF "system_logs"
-- FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- 创建视图以简化常用查询
CREATE VIEW "active_workflows" AS
SELECT 
  w.*,
  u.firstName || ' ' || u.lastName as owner_name,
  COUNT(e.id) as execution_count
FROM "workflows" w
LEFT JOIN "users" u ON w.userId = u.id
LEFT JOIN "executions" e ON w.id = e.workflowId
WHERE w.status = 'ACTIVE' AND w.isActive = true
GROUP BY w.id, u.firstName, u.lastName;

CREATE VIEW "execution_summary" AS
SELECT 
  e.*,
  w.name as workflow_name,
  u.firstName || ' ' || u.lastName as user_name,
  COUNT(er.id) as total_steps,
  COUNT(CASE WHEN er.status = 'COMPLETED' THEN 1 END) as completed_steps,
  AVG(CASE WHEN er.actualTime IS NOT NULL THEN er.actualTime END) as avg_step_time
FROM "executions" e
LEFT JOIN "workflows" w ON e.workflowId = w.id
LEFT JOIN "users" u ON e.userId = u.id
LEFT JOIN "execution_records" er ON e.id = er.executionId
GROUP BY e.id, w.name, u.firstName, u.lastName;

-- 创建函数来计算执行进度
CREATE OR REPLACE FUNCTION calculate_execution_progress(execution_id TEXT)
RETURNS FLOAT AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  progress FLOAT;
BEGIN
  SELECT COUNT(*) INTO total_steps
  FROM "execution_records"
  WHERE "executionId" = execution_id;
  
  SELECT COUNT(*) INTO completed_steps
  FROM "execution_records"
  WHERE "executionId" = execution_id AND status = 'COMPLETED';
  
  IF total_steps = 0 THEN
    RETURN 0;
  END IF;
  
  progress := (completed_steps::FLOAT / total_steps::FLOAT) * 100;
  
  -- 更新执行记录的进度
  UPDATE "executions" 
  SET progress = progress 
  WHERE id = execution_id;
  
  RETURN progress;
END;
$$ LANGUAGE plpgsql;