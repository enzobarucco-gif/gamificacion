terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Estado remoto en S3 — crear el bucket manualmente antes del primer apply
  backend "s3" {
    bucket         = "pgd-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "sa-east-1"
    encrypt        = true
    dynamodb_table = "pgd-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "pgd"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "pgd-${var.environment}"
}
