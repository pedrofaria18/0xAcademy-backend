# 0xAcademy API Collection - Insomnia

Coleção completa de todas as requisições da API do 0xAcademy Backend para importar no Insomnia.

## 📋 Conteúdo

A coleção inclui **27 endpoints** organizados em 6 categorias:

1. **Health** (1 endpoint)
   - Health Check

2. **Authentication** (4 endpoints)
   - Generate Nonce
   - Verify Signature & Login
   - Get Current User
   - Logout

3. **Courses** (8 endpoints)
   - List Courses
   - Get Course Details
   - Create Course
   - Update Course
   - Delete Course
   - Publish/Unpublish Course
   - Enroll in Course
   - My Enrolled Courses

4. **Lessons** (2 endpoints)
   - List Course Lessons
   - Create Lesson

5. **Videos** (5 endpoints)
   - Generate Upload URL
   - Get Video Details
   - Delete Video
   - Generate Signed URL
   - Cloudflare Webhook

6. **User** (7 endpoints)
   - Get My Profile
   - Update My Profile
   - My Teaching Courses
   - My Learning Progress
   - Mark Lesson as Complete
   - My Certificates
   - Get Public User Profile

## 🚀 Como Importar no Insomnia

### Passo 1: Abrir o Insomnia
Abra o aplicativo Insomnia no seu computador.

### Passo 2: Importar a Coleção
1. Clique no menu **Application** → **Preferences** → **Data** → **Import Data**
2. Ou use o atalho: **Ctrl/Cmd + O**
3. Selecione **From File**
4. Navegue até o arquivo `insomnia_collection.json`
5. Clique em **Import**

### Passo 3: Verificar a Importação
Você verá um novo workspace chamado **"0xAcademy Backend API"** com todas as requisições organizadas em pastas.

## ⚙️ Configurar Variáveis de Ambiente

A coleção usa variáveis de ambiente para facilitar o uso. Configure-as antes de usar:

### Variáveis Disponíveis:

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `base_url` | `http://localhost:3001` | URL base da API |
| `jwt_token` | *(vazio)* | Token JWT após login |
| `wallet_address` | `0x1234...` | Endereço da wallet Ethereum |
| `course_id` | *(vazio)* | ID de um curso para testes |
| `lesson_id` | *(vazio)* | ID de uma lesson para testes |
| `video_id` | *(vazio)* | ID de um vídeo para testes |

### Como Configurar:

1. Clique no ícone de **Environment** (canto superior esquerdo)
2. Selecione **Base Environment**
3. Edite os valores conforme necessário:

```json
{
  "base_url": "http://localhost:3001",
  "jwt_token": "",
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "course_id": "",
  "lesson_id": "",
  "video_id": ""
}
```

## 🔐 Fluxo de Autenticação

Para usar endpoints autenticados, siga este fluxo:

### 1. Gerar Nonce
Execute: **Authentication → 1. Generate Nonce**

```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

Resposta:
```json
{
  "nonce": "ABC123XYZ456..."
}
```

### 2. Assinar Mensagem SIWE
Use uma wallet (MetaMask, etc) para assinar a mensagem SIWE com o nonce recebido.

Formato da mensagem:
```
localhost:3001 wants you to sign in with your Ethereum account:
0x1234567890123456789012345678901234567890

Sign in with Ethereum to the app.

URI: http://localhost:3001
Version: 1
Chain ID: 1
Nonce: ABC123XYZ456...
Issued At: 2024-11-20T12:00:00.000Z
```

### 3. Verificar Assinatura e Login
Execute: **Authentication → 2. Verify Signature & Login**

```json
{
  "message": "localhost:3001 wants you to sign...",
  "signature": "0xabcdef1234567890..."
}
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "address": "0x1234...",
    "created_at": "2024-11-20T..."
  }
}
```

### 4. Salvar o Token
Copie o valor de `token` e cole na variável de ambiente `jwt_token`.

### 5. Usar Endpoints Autenticados
Agora você pode executar qualquer endpoint que requer autenticação. O header `Authorization: Bearer {{ _.jwt_token }}` será adicionado automaticamente.

## 📚 Exemplos de Uso

### Criar um Curso

1. Certifique-se de estar autenticado (jwt_token configurado)
2. Execute: **Courses → Create Course**
3. Ajuste o body conforme necessário:

```json
{
  "title": "Introdução ao Ethereum",
  "description": "Aprenda os fundamentos do Ethereum...",
  "price_usd": 99.99,
  "thumbnail_url": "https://example.com/thumb.jpg",
  "category": "blockchain",
  "level": "beginner",
  "is_public": false,
  "tags": ["ethereum", "smart-contracts", "web3"]
}
```

4. Salve o `id` do curso retornado na variável `course_id`

### Adicionar uma Lesson

1. Configure a variável `course_id` com um curso existente
2. Execute: **Lessons → Create Lesson**
3. Ajuste o body:

```json
{
  "title": "Introdução ao Ethereum",
  "description": "Conceitos básicos...",
  "order": 1,
  "duration_minutes": 45,
  "is_free": true
}
```

4. Salve o `id` da lesson retornada na variável `lesson_id`

### Upload de Vídeo

1. Configure `course_id` e `lesson_id`
2. Execute: **Videos → Generate Upload URL**
3. Use a `uploadURL` retornada para fazer upload do vídeo:

```bash
curl -X POST "<uploadURL>" \
  -F file=@video.mp4
```

4. Salve o `videoId` retornado na variável `video_id`

### Matricular em Curso

1. Configure `course_id` com o ID do curso desejado
2. Execute: **Courses → Enroll in Course**
3. Você será matriculado automaticamente (se o curso for gratuito)

### Marcar Lesson como Completa

1. Configure `lesson_id` com a lesson a ser marcada
2. Execute: **User → Mark Lesson as Complete**
3. O endpoint retorna se o curso inteiro foi completado

## 🔧 Endpoints Especiais

### Rate Limiting
Todos os endpoints `/api/*` têm rate limiting:
- **Janela**: 15 minutos
- **Limite**: 100 requisições por IP

Se exceder o limite, você receberá:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

### Webhook do Cloudflare
O endpoint **Videos → Cloudflare Webhook** é chamado automaticamente pelo Cloudflare quando o processamento de um vídeo é concluído. Você não precisa executá-lo manualmente em condições normais.

### Endpoints Não Implementados
- **Videos → Generate Signed URL**: Retorna erro 501 (não implementado)

## 📝 Notas Importantes

### Autenticação
- Tokens JWT expiram após 7 dias (padrão)
- Use `GET /api/auth/me` para verificar se o token ainda é válido
- Se receber erro 401, gere um novo token fazendo login novamente

### Propriedade de Recursos
- Apenas o proprietário de um curso pode:
  - Atualizar o curso
  - Deletar o curso
  - Publicar/despublicar o curso
  - Adicionar lessons ao curso
  - Gerar URLs de upload de vídeo

### Acesso a Cursos
Para acessar o conteúdo de um curso (lessons), você precisa:
- Ser o proprietário do curso, OU
- Estar matriculado no curso, OU
- O curso ser público (`is_public: true`)

### Publicação de Cursos
Para publicar um curso:
- O curso deve ter pelo menos 1 lesson
- Execute `POST /api/courses/:courseId/publish` com `{"publish": true}`

### Validação de Dados
Todos os endpoints validam os dados de entrada usando Zod. Se a validação falhar, você receberá:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title must be at least 3 characters"
    }
  ]
}
```

## 🛠️ Troubleshooting

### Erro 401 - Unauthorized
- Verifique se o `jwt_token` está configurado corretamente
- Verifique se o token não expirou
- Faça login novamente se necessário

### Erro 403 - Forbidden
- Você não tem permissão para acessar este recurso
- Verifique se você é o proprietário do curso
- Verifique se você está matriculado no curso

### Erro 404 - Not Found
- O recurso solicitado não existe
- Verifique se o ID está correto
- Para cursos: verifique se o curso está publicado

### Erro 400 - Bad Request
- Dados de entrada inválidos
- Verifique o body da requisição
- Consulte os erros de validação na resposta

## 📖 Documentação Adicional

Para mais detalhes sobre a API, consulte:
- Código fonte em: `/src/routes/`
- Schemas de validação em: `/src/routes/*.routes.ts`
- Middlewares em: `/src/middleware/`

## 🤝 Contribuindo

Se encontrar algum problema ou quiser sugerir melhorias:
1. Abra uma issue no repositório
2. Descreva o problema ou sugestão
3. Inclua exemplos de requisições se possível

---

**Desenvolvido para 0xAcademy** 🎓⛓️
