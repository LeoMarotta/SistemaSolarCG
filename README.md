# Projeto: Sistema Solar Interativo em WebGL2

Este projeto é o desenvolvimento de uma simulação 3D interativa do Sistema Solar, como parte de um trabalho acadêmico. A simulação utilizará dados astronômicos reais para as órbitas e características dos corpos celestes e será renderizada em tempo real com WebGL2.

## Progresso Atual

1.  **Configuração Inicial do Projeto:** O ambiente foi configurado com um canvas HTML e a inicialização do contexto WebGL2 foi verificada.

## Tecnologias Utilizadas

* **Gráficos:** WebGL2
* **Linguagem:** JavaScript
* **Bibliotecas Auxiliares:**
    * [cite_start][TWGL.js](https://twgljs.org/) 
    * [cite_start][WebGL2 Fundamentals Utils](https://webgl2fundamentals.org/) 

## Estrutura de Arquivos
.
├── index.html       # Estrutura principal da página
├── main.js          # Código JavaScript da aplicação
└── README.md        # Documentação do projeto

## Como Executar o Projeto

Devido às políticas de segurança dos navegadores (CORS), os arquivos não podem ser abertos diretamente no navegador. É necessário servi-los através de um servidor web local.

1.  Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
2.  Abra um terminal na raiz do projeto.
3.  Execute o seguinte comando para iniciar um servidor local:
    ```bash
    npx serve
    ```
4.  Abra seu navegador e acesse a URL fornecida pelo comando (geralmente `http://localhost:5000`).
