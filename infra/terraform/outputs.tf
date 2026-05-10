output "alb_dns_name" {
  description = "DNS del ALB — apuntar el dominio acá si Route53 no está en esta cuenta"
  value       = aws_lb.main.dns_name
}

output "ecr_api_url" {
  description = "URL del repositorio ECR para la API"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_url" {
  description = "URL del repositorio ECR para el frontend"
  value       = aws_ecr_repository.web.repository_url
}

output "github_deploy_role_arn" {
  description = "ARN del rol IAM para GitHub Actions — configurar como secret AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_deploy.arn
}

output "rds_endpoint" {
  description = "Endpoint de la base de datos (sin puerto)"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Endpoint primario de ElastiCache"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.main.name
}

output "post_apply_steps" {
  description = "Pasos manuales después del primer apply"
  value       = <<-EOT
    1. Habilitar PostGIS en RDS:
       PGPASSWORD=<password> psql -h ${aws_db_instance.main.endpoint} -U pgd pgd \
         -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS postgis;"

    2. Crear secrets faltantes en Secrets Manager:
       aws secretsmanager create-secret --name pgd/production/jwt-secret --secret-string "<valor>"
       aws secretsmanager create-secret --name pgd/production/jwt-refresh-secret --secret-string "<valor>"
       aws secretsmanager create-secret --name pgd/production/mp-access-token --secret-string "<valor>"
       aws secretsmanager create-secret --name pgd/production/mp-webhook-secret --secret-string "<valor>"
       aws secretsmanager create-secret --name pgd/production/sentry-dsn --secret-string "<valor>"

    3. Configurar secrets en GitHub Actions:
       - AWS_ACCOUNT_ID: ${data.aws_caller_identity.current.account_id}
       - AWS_DEPLOY_ROLE_ARN: ${aws_iam_role.github_deploy.arn}
       - NEXT_PUBLIC_API_URL: https://${var.domain_name}/api/v1

    4. Ejecutar primera migración:
       pnpm db:migrate (o via el job migrate del workflow de deploy)
  EOT
}
