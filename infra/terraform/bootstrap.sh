#!/usr/bin/env bash
# Crea los recursos de AWS necesarios ANTES del primer `terraform init`.
# Ejecutar una sola vez por cuenta/región.
#
# Uso:
#   export AWS_PROFILE=tu-perfil   # o configura las credenciales de otra forma
#   bash infra/terraform/bootstrap.sh [sa-east-1] [pgd]
set -euo pipefail

REGION="${1:-sa-east-1}"
PROJECT="${2:-pgd}"

BUCKET="${PROJECT}-terraform-state"
TABLE="${PROJECT}-terraform-locks"

echo "🔧 Bootstrap Terraform state — región: $REGION"
echo "   Bucket S3:       $BUCKET"
echo "   DynamoDB Table:  $TABLE"
echo ""

# ── S3 bucket para el state ────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null; then
  echo "  ✓ Bucket S3 '$BUCKET' ya existe"
else
  echo "  → Creando bucket S3..."
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi

  # Versionado — permite rollback del state
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  # Cifrado en reposo
  aws s3api put-bucket-encryption \
    --bucket "$BUCKET" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"},
        "BucketKeyEnabled": true
      }]
    }'

  # Bloquear acceso público
  aws s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  echo "  ✓ Bucket S3 creado y configurado"
fi

# ── DynamoDB table para locks ──────────────────────────────────────────────
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" 2>/dev/null | grep -q ACTIVE; then
  echo "  ✓ DynamoDB table '$TABLE' ya existe"
else
  echo "  → Creando DynamoDB table..."
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  echo "  ✓ DynamoDB table creada"
fi

# ── GitHub OIDC provider (si no existe) ───────────────────────────────────
OIDC_URL="https://token.actions.githubusercontent.com"
THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

if aws iam list-open-id-connect-providers 2>/dev/null | grep -q "token.actions.githubusercontent.com"; then
  echo "  ✓ GitHub OIDC provider ya existe"
else
  echo "  → Creando GitHub OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "$OIDC_URL" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "$THUMBPRINT"
  echo "  ✓ GitHub OIDC provider creado"
fi

echo ""
echo "✅ Bootstrap completo. Ahora podés ejecutar:"
echo ""
echo "   cd infra/terraform"
echo "   terraform init"
echo "   terraform plan -var=\"domain_name=pgd.ar\""
echo "   terraform apply -var=\"domain_name=pgd.ar\""
echo ""
echo "Después del apply, seguí los pasos en el output 'post_apply_steps'."
