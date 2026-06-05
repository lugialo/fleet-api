# Fleet API

API NestJS para gerenciamento de frota. Inclui gerenciamento de marcas, modelos e veículos.

## Stack

- NestJS
- TypeORM
- SQL Server
- Redis cache
- JWT + Passport
- MongoDB para auditoria
- RabbitMQ para eventos
- Jest
- Docker Compose

## Requisitos

- Node.js 24+
- Docker e Docker Compose
- npm

## Configuração

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite as senhas no `.env`. Para desenvolvimento local, confira principalmente:

```env
DB_HOST=localhost
DB_PORT=1443
DB_USERNAME=sa
DB_NAME=fleet
DB_PASSWORD=your_password_here

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600

RABBITMQ_HOST=localhost
RABBITMQ_USER=fleet
RABBITMQ_PASSWORD=your_password_here
RABBITMQ_PORT=5672

MONGO_HOST=localhost
MONGO_USERNAME=fleet
MONGO_PASSWORD=your_password_here
MONGO_DATABASE=fleet_audit
MONGO_PORT=27017

JWT_SECRET=jwt_secret_here
JWT_EXPIRATION=1d
```

## Subir Infraestrutura

```bash
docker compose up -d
docker compose ps
```

Serviços esperados:

- SQL Server
- Redis
- RabbitMQ
- MongoDB

RabbitMQ Management:

```text
http://localhost:15672
```

## Instalar Dependências

```bash
npm install
```

## Rodar a API

```bash
npm run start:dev
```

## Seeds

Criar usuário padrão `aivacol`:

```bash
npm run seed:user
```

Criar marcas, modelos e veículos a partir de `seed_vehicles.json`:

```bash
npm run seed:vehicles
```

Rodar todos os seeds:

```bash
npm run seed
```

Usuário padrão:

```json
{
  "nickname": "aivacol",
  "password": "aivacol123"
}
```

## Testes

Testes Unitários:

```bash
npm test
```

Testes E2E:

```bash
npm run test:e2e
```

Cobertura:

```bash
npm run test:cov
```

Build:

```bash
npm run build
```

Lint:

```bash
npx eslint "src/**/*.ts" "test/**/*.ts"
```

## Dockerfile

Build da imagem:

```bash
docker build -t fleet-api .
```

Rodar container:

```bash
docker run --env-file .env -p 3000:3000 fleet-api
```

Observação: quando a API roda em container na mesma network do Compose, use hosts dos servicos (`sqlserver`, `redis`, `rabbitmq`, `mongodb`) no `.env`.

## Autenticacao

Login:

```http
POST /auth/login
Content-Type: application/json

{
  "nickname": "aivacol",
  "password": "aivacol123"
}
```

Resposta:

```json
{
  "access_token": "jwt-token"
}
```

Use o token:

```http
Authorization: Bearer jwt-token
```

## Fluxo Principal

Criar marca:

```http
POST /brands
Authorization: Bearer jwt-token
Content-Type: application/json

{
  "name": "Toyota"
}
```

Criar modelo:

```http
POST /models
Authorization: Bearer jwt-token
Content-Type: application/json

{
  "name": "Corolla",
  "fipe_code": "002062-6",
  "brand_id": "uuid-da-marca"
}
```

Criar veículo:

```http
POST /vehicles
Authorization: Bearer jwt-token
Content-Type: application/json

{
  "plate": "ABC1234",
  "color": "Preto",
  "year": 2022,
  "model_id": "uuid-do-modelo"
}
```

Listar veículos:

```http
GET /vehicles
Authorization: Bearer jwt-token
```

## Cache Redis

`GET /vehicles` usa a chave:

```text
vehicles_list
```

O TTL vem de:

```env
REDIS_TTL=3600
```

Ao criar, atualizar ou remover veículos, a chave `vehicles_list` é invalidada.

## Auditoria MongoDB

O `AuditInterceptor` global grava no MongoDB:

- usuário
- método HTTP
- rota
- payload
- status code
- mensagem de erro, quando houver
- data

Collection:

```text
audit_logs
```

## Mensageria RabbitMQ

Ao criar um veículo, a API emite o evento:

```text
vehicle_created
```

O listener `VehicleEventsController` consome o evento e registra no log.

Fila:

```text
fleet_events
```
