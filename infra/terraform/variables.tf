variable "aws_region" {
  description = "Región AWS — sa-east-1 (São Paulo) para menor latencia desde Argentina"
  type        = string
  default     = "sa-east-1"
}

variable "environment" {
  description = "Nombre del ambiente (production, staging)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Dominio principal (ej: pgd.ar)"
  type        = string
}

variable "api_subdomain" {
  description = "Subdominio para la API"
  type        = string
  default     = "api"
}

variable "db_instance_class" {
  description = "Clase de instancia RDS"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Storage inicial RDS en GB"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "Tipo de nodo ElastiCache"
  type        = string
  default     = "cache.t3.micro"
}

variable "api_cpu" {
  description = "CPU units para el task de API (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory MB para el task de API"
  type        = number
  default     = 1024
}

variable "web_cpu" {
  description = "CPU units para el task de Web"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory MB para el task de Web"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Número de tasks de API"
  type        = number
  default     = 2
}

variable "web_desired_count" {
  description = "Número de tasks de Web"
  type        = number
  default     = 2
}

variable "ecr_image_tag" {
  description = "Tag de imagen Docker a deployar (se sobreescribe en CI/CD)"
  type        = string
  default     = "latest"
}
