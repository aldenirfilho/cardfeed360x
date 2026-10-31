# CardFeed360X 🩺

Seu acervo visual de medicina, em um feed de figurinhas. Importe imagens em lote, encontre temas, crie coleções e mantenha os dados de cada figura à mão.

## O que você pode fazer

- Importar várias imagens de uma vez, por seleção ou arrastando para o site.
- Usar JPG, PNG, WEBP e GIF, com limite de 20 MB por imagem.
- Receber sugestões de especialidade e tags a partir do nome do arquivo.
- Editar título, especialidade, coleção, tags, fonte e notas de estudo.
- Buscar por termos, filtrar por especialidade e separar favoritas e itens para revisar.
- Alternar entre grade e lista, ampliar imagens e usar o modo escuro.
- Exportar e restaurar um backup completo com as imagens e seus metadados.

O site inclui oito ilustrações esquemáticas originais de demonstração. Elas não são imagens enviadas pelo usuário e ficam fora do backup pessoal.

## Como funciona a classificação

A versão atual usa regras sobre o **nome do arquivo**. Por exemplo, `anatomia_coracao.png` pode sugerir Cardiologia. Um arquivo chamado `IMG_0001.jpg` ficará em “A classificar”.

**Não há leitura do conteúdo das imagens, OCR ou interpretação por inteligência artificial nesta versão.** A classificação é uma sugestão: abra a figurinha, confira os dados e marque “Conferi os dados e a classificação”. A seção “Para revisar” reúne os itens ainda não conferidos.

O site organiza materiais de estudo. As ilustrações demonstrativas são simplificadas e não constituem protocolos, exames reais ou recomendações clínicas.

## Onde ficam suas imagens

As imagens e o catálogo ficam no **IndexedDB do navegador**, associados à origem do site. Nada é enviado automaticamente ao GitHub ou a outro serviço. O repositório contém o aplicativo e as demonstrações, não seu acervo importado.

Cada navegador, perfil e dispositivo mantém seu próprio acervo. A versão em `localhost` também usa um armazenamento diferente da versão hospedada. Sites que compartilham exatamente a mesma origem podem acessar o mesmo banco: em GitHub Pages, diferentes projetos de uma mesma conta costumam compartilhar a origem `https://USUARIO.github.io`. Para isolamento por projeto, use uma origem própria e exclusiva.

Limpar os dados do navegador, usar uma sessão privada ou exceder o espaço disponível pode impedir o acesso ou causar perda de dados. Faça backup regularmente. Este projeto não oferece contas, sincronização entre dispositivos ou armazenamento clínico com controle de acesso. Use materiais educacionais sem identificação de pacientes.

## Começar a usar

1. Abra o site e clique em **Adicionar lote**.
2. Escolha várias imagens; se quiser, informe uma coleção e especialidade para o lote.
3. Abra as figurinhas para conferir título, classificação e fonte.
4. Use **Exportar meu backup** para salvar uma cópia do acervo.

Imagens com o mesmo conteúdo são identificadas pelo hash SHA-256, mesmo quando têm nomes diferentes. A restauração adiciona itens ao acervo existente; não apaga o catálogo atual. O backup contém imagens e metadados: guarde-o em um local privado. O formato atual aceita até 5.000 figurinhas e 500 MB de imagens por backup; a memória disponível no dispositivo também limita operações grandes.

## Executar no computador

Você precisa de Node.js 24 e Python 3. Não há dependências para instalar.

```sh
npm start
```

Abra [http://localhost:3600](http://localhost:3600). O servidor atende apenas o próprio computador. Use o endereço HTTP; abrir `index.html` diretamente pode bloquear os módulos JavaScript.

Para verificar o projeto:

```sh
npm test
npm run check
```

## Hospedar no GitHub Pages

O projeto é estático e pode ser hospedado como site de projeto no GitHub Pages, sem etapa de compilação e sem chaves de API.

1. Envie os arquivos deste projeto para a raiz do repositório.
2. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como origem.
3. Envie um commit para `main` ou execute manualmente o fluxo **Deploy CardFeed360X** na aba **Actions**.
4. Confira a execução e abra o endereço informado pelo passo de publicação.

O fluxo executa os testes e a verificação de sintaxe antes de publicar. Ele inclui apenas os arquivos estáticos necessários, por uma lista explícita de arquivos. README, testes e arquivos locais não entram no artefato do site.

Ter os arquivos no GitHub não significa que o GitHub Pages já esteja ativo. A publicação depende da configuração e das permissões da conta/repositório. Mesmo com o site publicado, as imagens que você importar continuam no seu navegador.

## Estrutura

```text
index.html                 Interface e diálogos
styles.css                 Layout, responsividade e temas
app.js                     Interações do aplicativo
core.js                    Classificação, busca e formato do backup
storage.js                 Persistência local em IndexedDB
demo.js                    Catálogo de demonstração
assets/*.svg               Ilustrações e ícone originais
tests/                     Testes das regras e do backup
.github/workflows/pages.yml Validação e publicação no GitHub Pages
```

## Licença

Código e ilustrações originais distribuídos sob a [licença MIT](LICENSE). Materiais importados pelos usuários mantêm seus próprios direitos e condições de uso.
