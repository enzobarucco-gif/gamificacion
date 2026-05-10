resource "random_password" "db" {
  length  = 32
  special = false
}

# ── Subnet group para RDS ─────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db"
  subnet_ids = aws_subnet.private[*].id
}

# ── RDS PostgreSQL 16 con PostGIS ─────────────────────────────────────────────
resource "aws_db_instance" "main" {
  identifier        = "${local.name_prefix}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_encrypted = true
  storage_type      = "gp3"

  db_name  = "pgd"
  username = "pgd"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"

  # PostGIS se habilita via SQL después del primer apply (ver outputs)
  parameter_group_name = aws_db_parameter_group.main.name

  tags = { Name = "${local.name_prefix}-postgres" }
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-pg16"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }
}

# ── ElastiCache Redis 7 ───────────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "PGD Redis — sessions, queues, validation cache"

  node_type            = var.redis_node_type
  port                 = 6379
  num_cache_clusters   = 1

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # TLS dentro de VPC privada es suficiente para MVP

  automatic_failover_enabled = false  # habilitar con num_cache_clusters >= 2

  tags = { Name = "${local.name_prefix}-redis" }
}

# ── Guardar credenciales en Secrets Manager ───────────────────────────────────
resource "aws_secretsmanager_secret" "db_url" {
  name                    = "pgd/production/database-url"
  description             = "DATABASE_URL para Prisma"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "pgd/production/redis-url"
  description             = "REDIS_URL para BullMQ e ioredis"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
}
