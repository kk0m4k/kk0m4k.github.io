---
title: "GitHub Actions와 OIDC를 이용한 안전한 AWS 배포 파이프라인 구축하기"
author: Francesco
layout: single
categories: AWS
author_profile: true
tags:
  - GitHub Actions
  - OIDC
  - ECR
  - EKS
---

# GitHub Actions와 OIDC를 이용한 안전한 AWS 배포 파이프라인 구축하기

Github Actions 기능을 이용하여 AWS ECR에 도커 이미지를 등록하고, EKS를 통해서 이미지를 배포할때, AWS Longterm Access Keys를 사용하지 않고, OIDC를 기반의 STS를 사용하는 방법에 대한 내용이니다.  많은 팀이 CI/CD 파이프라인에서 AWS에 접근하기 위해 IAM 사용자의 Access Key를 GitHub Secrets에 저장하여 사용합니다. 이 방식은 간단하지만, 다음과 같은 심각한 보안 위협을 내포하고 있습니다.

-   **키 유출 위험**: Secret에 저장된 키는 유출될 경우 큰 보안 사고로 이어질 수 있습니다.
-   **권한 관리의 어려움**: 정적 키는 보통 넓은 권한을 가지며, 최소 권한 원칙(Principle of Least Privilege)을 지키기 어렵습니다.
-   **주기적인 키 교체의 번거로움**: 보안을 위해 주기적으로 키를 교체해야 하지만, 이 과정은 번거롭고 실수가 발생하기 쉽습니다.

이러한 문제를 해결하기 위해, GitHub와 AWS는 OIDC를 통해 비밀번호 없는(passwordless) 인증 메커니즘을 제공합니다. 이 방식을 사용하면 GitHub Actions 워크플로우가 직접 AWS IAM 역할을 수임(AssumeRole)하여 필요한 권한만 가진 임시 자격 증명을 발급받을 수 있습니다.

## 전체 배포 흐름 및 아키텍처

`kkom4k/github-actions-practice` 리포지토리의 배포 프로세스는 다음과 같이 진행됩니다.

```
┌──────────────────────────────────┐
│ GitHub (repo: kkom4k/github-actions-practice) │
│                                  │
│   ┌──────────────────────────┐   │         1. Request Role with JWT (ID Token)
│   │  GitHub Actions Workflow │   │───────────────────────────────────────────>
│   │ (on: push to main)       │   │
│   └──────────────────────────┘   │         2. Temporary Credentials
│                                  │<───────────────────────────────────────────
└──────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────────────┐
│ AWS Cloud (Account: 992382851829)                                              │
│                                                                                │
│   ┌──────────────────────────┐                                                 │
│   │         AWS STS          │<───(Request from GitHub Actions)                │
│   │ (Security Token Service) │                                                 │
│   │                          │───>(Response to GitHub Actions)                 │
│   │ Validates JWT,           │                                                 │
│   │ Issues Temp Credentials  │                                                 │
│   └─────────────┬────────────┘                                                 │
│                 │                                                              │
│                 │ (Actions are performed using the temporary credentials)      │
│                 │                                                              │
│   ┌─────────────▼────────────┐                ┌──────────────────────────────┐ │
│   │     Amazon ECR           │<───────────────┤ 3. docker push to '''kkom4k'''   │ │
│   │ (repo: kkom4k)           │                └──────────────────────────────┘ │
│   └──────────────────────────┘                                                 │
│                                                                                │
│   ┌──────────────────────────┐                ┌──────────────────────────────┐ │
│   │     Amazon EKS           │<───────────────┤ 4. kubectl apply to '''kkom4k''' │ │
│   │ (cluster: kkom4k)        │                └──────────────────────────────┘ │
│   └──────────────────────────┘                                                 │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 구현 단계별 가이드

이제 실제로 어떻게 설정하는지 단계별로 알아보겠습니다.

### 1단계: AWS IAM 설정

가장 먼저 AWS에서 `kkom4k/github-actions-practice` 리포지토리의 Actions를 신뢰하도록 OIDC 자격 증명 공급자와 IAM 역할을 설정해야 합니다.

#### 1.1. OIDC 자격 증명 공급자(Identity Provider) 추가

-   IAM 콘솔 > **자격 증명 공급자**에서 다음 정보로 공급자를 추가합니다.
    -   **공급자 URL**: `https://token.actions.githubusercontent.com`
    -   **대상(Audience)**: `sts.amazonaws.com`

#### 1.2. IAM 역할 생성

`deploy.yml`에서 사용하는 `arn:aws:iam::992382851829:role/github-actions-ecr-deploy-role` 역할을 생성합니다. 역할의 **신뢰 정책(Trust Policy)**은 GitHub Actions가 이 역할을 수임(Assume)할 수 있도록 허용하는 설정입니다.

-   **신뢰할 수 있는 엔터티 유형**: 웹 자격 증명(Web identity)
-   **자격 증명 공급자**: 위에서 만든 `token.actions.githubusercontent.com`
-   **신뢰 정책 편집**: `kkom4k/github-actions-practice` 리포지토리의 `main` 브랜치에서만 역할을 수임할 수 있도록 **조건(Condition)**을 추가합니다.

    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "arn:aws:iam::992382851829:oidc-provider/token.actions.githubusercontent.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": "repo:kkom4k/github-actions-practice:ref:refs/heads/main"
                    }
                }
            }
        ]
    }
    ```

#### 1.3. IAM 권한 정책 연결

이제 역할이 수임된 후 **수행할 수 있는 작업**을 정의하는 **권한 정책(Permissions Policy)**을 연결합니다. 최소 권한 원칙에 따라 ECR과 EKS에 필요한 최소한의 권한만 부여하는 것이 좋습니다.

##### ECR 푸시를 위한 권한 정책 예시
Docker 이미지를 ECR에 푸시하기 위해 필요한 권한들입니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:GetAuthorizationToken"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:GetRepositoryPolicy",
                "ecr:DescribeRepositories",
                "ecr:ListImages",
                "ecr:DescribeImages",
                "ecr:BatchGetImage",
                "ecr:InitiateLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:CompleteLayerUpload",
                "ecr:PutImage"
            ],
            "Resource": "arn:aws:ecr:ap-northeast-2:992382851829:repository/kkom4k"
        }
    ]
}
```

##### EKS 배포를 위한 권한 정책 예시
`aws eks update-kubeconfig` 명령을 실행하여 `kubectl`이 클러스터와 통신할 수 있도록 설정하는 권한입니다.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "eks:DescribeCluster",
            "Resource": "arn:aws:eks:ap-northeast-2:992382851829:cluster/kkom4k"
        }
    ]
}
```
이 정책들을 `github-actions-ecr-deploy-role` 역할에 연결합니다.

### 2단계: GitHub Actions 워크플로우 (`deploy.yml`) 작성

다음은 `kkom4k/github-actions-practice` 리포지토리의 `.github/workflows/deploy.yml` 파일의 핵심 내용입니다.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Amazon EKS using OIDC

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: kkom4k
  EKS_CLUSTER_NAME: kkom4k
  K8S_DEPLOYMENT_NAME: kkom4k-app-deployment
  K8S_CONTAINER_NAME: kkom4k-app-container
  AWS_ROLE_ARN: arn:aws:iam::992382851829:role/github-actions-ecr-deploy-role

jobs:
  build-and-push:
    name: Build and Push to ECR
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build-image.outputs.image }}
    steps:
      - name: Checkout source code
        uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ env.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        run: |
          IMAGE_URI="${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }}"
          docker build -t $IMAGE_URI .
          docker push $IMAGE_URI
          echo "image=${IMAGE_URI}" >> $GITHUB_OUTPUT

  deploy-to-eks:
    name: Deploy to EKS Cluster
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - name: Checkout source code
        uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ env.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER_NAME }} --region ${{ env.AWS_REGION }}
      - name: Deploy to EKS
        run: |
          IMAGE_URI=${{ needs.build-and-push.outputs.image }}
          kubectl set image deployment/${{ env.K8S_DEPLOYMENT_NAME }} ${{ env.K8S_CONTAINER_NAME }}=${IMAGE_URI}
```

### 3단계: Kubernetes 매니페스트 파일 작성

마지막으로 EKS에 배포할 애플리케이션의 `Deployment` 매니페스트 파일 예시입니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kkom4k-app-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kkom4k-app
  template:
    metadata:
      labels:
        app: kkom4k-app
    spec:
      containers:
      - name: kkom4k-app-container
        image: YOUR_ECR_REPO_URI # 이 부분은 GitHub Actions에서 동적으로 교체됩니다.
        ports:
        - containerPort: 80
```

AWS와 GitHub를 사용하고 있다면, 지금 바로 여러분의 CI/CD 파이프라인에 OIDC 인증 방식을 도입하여 더 안전하고 효율적인 개발 문화를 만들어가시길 바랍니다.
