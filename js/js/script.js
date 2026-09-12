/* =====================================================================
   RotaExpress — Camada lógica (POO + Fetch API + DOM)
   Disciplina: Desenvolvimento Web — Projeto 01
   Padrão: ES6+ (const/let, arrow functions, template literals)
   ===================================================================== */

'use strict';

/* =====================================================================
   1) CLASSE Encomenda (ENTIDADE)
   Representa uma encomenda individual com regras de negócio de frete
   e ciclo de vida de status (Pendente → Em Trânsito → Entregue).
   ===================================================================== */
class Encomenda {
  /* Valor fixo por quilograma transportado (R$/kg) */
  static #VALOR_POR_KG = 2.5;

  /* Tabela de modalidades disponíveis: rótulo, taxa-base e fator multiplicador */
  static MODALIDADES = {
    standard:    { rotulo: 'Standard',    base: 10, fator: 1   },
    expressa:    { rotulo: 'Expressa',    base: 20, fator: 1.5 },
    prioritaria: { rotulo: 'Prioritária', base: 30, fator: 2   }
  };

  /* Contador interno para geração de IDs sequenciais */
  static #contadorId = 0;

  /* --- Campos privados (encapsulamento real com #) --- */
  #id;
  #destinatario;
  #peso;
  #modalidade;
  #endereco;
  #status;

  /**
   * Construtor da encomenda.
   * @param {Object} dados
   * @param {string} dados.destinatario - Nome do destinatário.
   * @param {number} dados.peso         - Peso em quilogramas.
   * @param {string} dados.modalidade   - Chave da modalidade (standard, expressa, prioritaria).
   * @param {Object} dados.endereco     - Objeto com cep, logradouro, bairro, cidade e uf.
   */
  constructor({ destinatario, peso, modalidade, endereco }) {
    if (!destinatario || !peso || !modalidade || !endereco) {
      throw new Error('Dados obrigatórios ausentes para criar a encomenda.');
    }
    if (!Encomenda.MODALIDADES[modalidade]) {
      throw new Error(`Modalidade inválida: ${modalidade}`);
    }

    this.#id           = Encomenda.#gerarId();
    this.#destinatario = String(destinatario).trim();
    this.#peso         = Number(peso);
    this.#modalidade   = modalidade;
    this.#endereco     = { ...endereco };
    this.#status       = 'Pendente'; // Estado inicial padrão
  }

  /**
   * Gera um ID sequencial no formato ENC-0001.
   * @returns {string}
   */
  static #gerarId() {
    Encomenda.#contadorId += 1;
    return `ENC-${String(Encomenda.#contadorId).padStart(4, '0')}`;
  }

  /* ---------- Getters (acesso controlado aos campos privados) ---------- */
  get id()           { return this.#id; }
  get destinatario() { return this.#destinatario; }
  get peso()         { return this.#peso; }
  get modalidade()   { return this.#modalidade; }
  get status()       { return this.#status; }

  /* Retorna cópia defensiva do endereço para preservar o encapsulamento */
  get endereco() { return { ...this.#endereco }; }

  /**
   * Calcula o valor do frete com base na modalidade e no peso.
   * Regra: frete = taxaBase + (peso * valorPorKg * fator)
   * @returns {number} Valor do frete arredondado em duas casas decimais.
   */
  calcularFrete() {
    const mod = Encomenda.MODALIDADES[this.#modalidade];
    const bruto = mod.base + this.#peso * Encomenda.#VALOR_POR_KG * mod.fator;
    return Math.round(bruto * 100) / 100;
  }

  /**
   * Avança o status seguindo o fluxo Pendente → Em Trânsito → Entregue.
   * @returns {boolean} true se o status foi alterado, false se já está em "Entregue".
   */
  avancarStatus() {
    if (this.#status === 'Pendente') {
      this.#status = 'Em Trânsito';
      return true;
    }
    if (this.#status === 'Em Trânsito') {
      this.#status = 'Entregue';
      return true;
    }
    return false; // Já está entregue — não há próximo estado
  }
}

/* =====================================================================
   2) CLASSE GerenciadorLogistica (GERENCIADOR)
   Centraliza a coleção de encomendas, transições de estado,
   faturamento e contadores do painel.
   ===================================================================== */
class GerenciadorLogistica {
  /* Coleção privada de encomendas */
  #encomendas;

  constructor() {
    this.#encomendas = [];
  }

  /** Retorna cópia da coleção (imutabilidade externa) */
  get encomendas() { return [...this.#encomendas]; }

  /**
   * Cadastra uma nova encomenda no sistema.
   * @param {Encomenda} encomenda - Instância validada de Encomenda.
   * @returns {Encomenda}
   */
  adicionar(encomenda) {
    if (!(encomenda instanceof Encomenda)) {
      throw new Error('Apenas instâncias de Encomenda podem ser cadastradas.');
    }
    this.#encomendas.push(encomenda);
    return encomenda;
  }

  /**
   * Remove uma encomenda pelo ID.
   * @param {string} id
   * @returns {boolean} true se removeu, false se não encontrou.
   */
  remover(id) {
    const totalAntes = this.#encomendas.length;
    this.#encomendas = this.#encomendas.filter(enc => enc.id !== id);
    return this.#encomendas.length < totalAntes;
  }

  /**
   * Avança o status de uma encomenda específica.
   * @param {string} id
   * @returns {boolean} Resultado da transição.
   */
  avancarStatus(id) {
    const enc = this.#encomendas.find(e => e.id === id);
    if (!enc) return false;
    return enc.avancarStatus();
  }

  /**
   * Calcula o faturamento acumulado considerando apenas encomendas Entregues.
   * @returns {number}
   */
  calcularFaturamento() {
    return this.#encomendas
      .filter(enc => enc.status === 'Entregue')
      .reduce((soma, enc) => soma + enc.calcularFrete(), 0);
  }

  /**
   * Conta encomendas agrupadas por status.
   * @returns {{Pendente:number,'Em Trânsito':number,Entregue:number}}
   */
  contarPorStatus() {
    return this.#encomendas.reduce(
      (acc, enc) => {
        acc[enc.status] = (acc[enc.status] || 0) + 1;
        return acc;
      },
      { Pendente: 0, 'Em Trânsito': 0, Entregue: 0 }
    );
  }
}

/* =====================================================================
   3) CAMADA DE INTERFACE (DOM)
   ===================================================================== */

/* Instância única do gerenciador */
const gerenciador = new GerenciadorLogistica();

/* Atalhos de seleção do DOM */
const form            = document.getElementById('form-encomenda');
const listaCards      = document.getElementById('lista-encomendas');
const estadoVazio     = document.getElementById('estado-vazio');
const feedbackForm    = document.getElementById('feedback-form');
const feedbackCep     = document.getElementById('feedback-cep');
const btnBuscarCep    = document.getElementById('btn-buscar-cep');
const selectModalidade = document.getElementById('modalidade');

/* Campos do formulário */
const campoCep        = document.getElementById('cep');
const campoLogradouro = document.getElementById('logradouro');
const campoBairro     = document.getElementById('bairro');
const campoCidade     = document.getElementById('cidade');
const campoUf         = document.getElementById('uf');

/* Indicadores do painel */
const indTotal         = document.getElementById('ind-total');
const indPendentes     = document.getElementById('ind-pendentes');
const indTransito      = document.getElementById('ind-transito');
const indEntregues     = document.getElementById('ind-entregues');
const indFaturamento   = document.getElementById('ind-faturamento');

/* Formatador de moeda BRL */
const formatarBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

/* =====================================================================
   4) INICIALIZAÇÃO
   ===================================================================== */

/**
 * Popula o <select> de modalidades a partir da tabela estática da classe Encomenda.
 * Garante uma única fonte de verdade entre a regra de negócio e a UI.
 */
const popularModalidades = () => {
  const fragment = document.createDocumentFragment();

  Object.entries(Encomenda.MODALIDADES).forEach(([chave, { rotulo }]) => {
    const option = document.createElement('option');
    option.value = chave;
    option.textContent = rotulo;
    fragment.appendChild(option);
  });

  selectModalidade.appendChild(fragment);
};

/* =====================================================================
   5) CONSUMO ASSÍNCRONO — ViaCEP (async/await + try/catch/finally)
   ===================================================================== */

/**
 * Consulta o CEP informado na API pública ViaCEP e preenche os campos
 * de endereço do formulário.
 * @param {string} cep - CEP com ou sem máscara.
 */
const buscarEnderecoPorCep = async (cep) => {
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    definirFeedback(feedbackCep, 'Informe um CEP válido com 8 dígitos.', 'erro');
    return;
  }

  // Estado de carregamento
  definirFeedback(feedbackCep, 'Consultando ViaCEP...', 'carregando');
  btnBuscarCep.disabled = true;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

    if (!resposta.ok) {
      throw new Error(`Falha na requisição (HTTP ${resposta.status})`);
    }

    const dados = await resposta.json();

    // ViaCEP retorna { erro: true } quando o CEP não existe
    if (dados.erro) {
      throw new Error('CEP não encontrado na base do ViaCEP.');
    }

    // Preenchimento dos campos com fallback
    campoLogradouro.value = dados.logradouro || '';
    campoBairro.value     = dados.bairro     || '';
    campoCidade.value     = dados.localidade || '';
    campoUf.value         = (dados.uf || '').toUpperCase();

    definirFeedback(feedbackCep, `Endereço localizado: ${dados.localidade}/${dados.uf}`, 'ok');
  } catch (erro) {
    definirFeedback(feedbackCep, `Erro ao buscar CEP: ${erro.message}`, 'erro');
  } finally {
    btnBuscarCep.disabled = false;
  }
};

/* =====================================================================
   6) RENDERIZAÇÃO DO DOM
   ===================================================================== */

/**
 * Cria o elemento HTML de um card a partir de uma instância de Encomenda.
 * @param {Encomenda} encomenda
 * @returns {HTMLElement}
 */
const criarCard = (encomenda) => {
  const { logradouro, bairro, cidade, uf } = encomenda.endereco;
  const modInfo = Encomenda.MODALIDADES[encomenda.modalidade];

  const card = document.createElement('article');
  card.className = `card card--${encomenda.modalidade}`;
  card.dataset.id = encomenda.id;

  /* Classe utilitária para o selo de status (remove acento/espaço) */
  const statusClasse = encomenda.status
    .toLowerCase()
    .replace('á', 'a')
    .replace('â', 'a')
    .replace(' ', '');

  card.innerHTML = `
    <div class="card__topo">
      <div>
        <p class="card__id">${encomenda.id}</p>
        <h3 class="card__destinatario">${escaparHtml(encomenda.destinatario)}</h3>
      </div>
      <span class="card__modalidade">${modInfo.rotulo}</span>
    </div>

    <p class="card__endereco">
      ${escaparHtml(logradouro)}${bairro ? ' — ' + escaparHtml(bairro) : ''}<br>
      ${escaparHtml(cidade)}/${escaparHtml(uf)}
    </p>

    <div class="card__dados">
      <div class="card__dado">
        <span>Peso</span>
        <strong>${encomenda.peso.toFixed(1)} kg</strong>
      </div>
      <div class="card__dado">
        <span>Frete</span>
        <strong>${formatarBRL.format(encomenda.calcularFrete())}</strong>
      </div>
      <div class="card__dado">
        <span>Status</span>
        <strong><span class="status status--${statusClasse}">${encomenda.status}</span></strong>
      </div>
    </div>

    <div class="card__acoes">
      <button type="button" class="btn btn--acao btn--avancar" data-acao="avancar" ${encomenda.status === 'Entregue' ? 'disabled' : ''}>
        ${encomenda.status === 'Pendente' ? 'Iniciar trânsito' : encomenda.status === 'Em Trânsito' ? 'Marcar entregue' : 'Concluído'}
      </button>
      <button type="button" class="btn btn--acao btn--excluir" data-acao="excluir">Excluir</button>
    </div>
  `;

  return card;
};

/**
 * Redesenha a lista completa de cards e atualiza os indicadores.
 */
const renderizar = () => {
  listaCards.innerHTML = '';

  const encomendas = gerenciador.encomendas;

  if (encomendas.length === 0) {
    estadoVazio.hidden = false;
  } else {
    estadoVazio.hidden = true;
    const fragment = document.createDocumentFragment();
    encomendas.forEach(enc => fragment.appendChild(criarCard(enc)));
    listaCards.appendChild(fragment);
  }

  atualizarIndicadores();
};

/**
 * Atualiza os contadores e o faturamento exibidos no painel.
 */
const atualizarIndicadores = () => {
  const total = gerenciador.encomendas.length;
  const contagem = gerenciador.contarPorStatus();

  indTotal.textContent       = total;
  indPendentes.textContent   = contagem['Pendente'];
  indTransito.textContent    = contagem['Em Trânsito'];
  indEntregues.textContent   = contagem['Entregue'];
  indFaturamento.textContent = formatarBRL.format(gerenciador.calcularFaturamento());
};

/* =====================================================================
   7) UTILITÁRIOS
   ===================================================================== */

/**
 * Exibe uma mensagem de feedback em um parágrafo.
 * @param {HTMLElement} elemento - <p> de feedback.
 * @param {string} mensagem
 * @param {'ok'|'erro'|'carregando'|''} tipo
 */
function definirFeedback(elemento, mensagem, tipo = '') {
  elemento.textContent = mensagem;
  elemento.classList.remove('feedback--ok', 'feedback--erro', 'feedback--carregando');
  if (tipo) elemento.classList.add(`feedback--${tipo}`);
}

/**
 * Escapa caracteres HTML para evitar injeção de marcação (XSS).
 * @param {string} texto
 * @returns {string}
 */
function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

/**
 * Remove a máscara e aplica o formato 00000-000 em um CEP.
 * @param {string} valor
 * @returns {string}
 */
const formatarCep = (valor) => {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  return numeros.length > 5
    ? `${numeros.slice(0, 5)}-${numeros.slice(5)}`
    : numeros;
};

/* =====================================================================
   8) EVENTOS
   ===================================================================== */

/* Máscara de CEP em tempo real */
campoCep.addEventListener('input', (evento) => {
  evento.target.value = formatarCep(evento.target.value);
});

/* Botão "Buscar" — consulta o ViaCEP */
btnBuscarCep.addEventListener('click', () => {
  buscarEnderecoPorCep(campoCep.value);
});

/* Submissão do formulário — cadastro sem recarregar a página */
form.addEventListener('submit', (evento) => {
  evento.preventDefault(); // Impede o recarregamento

  // Revalidação explícita (garante feedback consistente)
  if (!form.checkValidity()) {
    form.reportValidity();
    definirFeedback(feedbackForm, 'Preencha todos os campos obrigatórios.', 'erro');
    return;
  }

  try {
    const endereco = {
      cep:        campoCep.value,
      logradouro: campoLogradouro.value.trim(),
      bairro:     campoBairro.value.trim(),
      cidade:     campoCidade.value.trim(),
      uf:         campoUf.value.trim().toUpperCase()
    };

    const encomenda = new Encomenda({
      destinatario: document.getElementById('destinatario').value,
      peso:         document.getElementById('peso').value,
      modalidade:   selectModalidade.value,
      endereco
    });

    gerenciador.adicionar(encomenda);
    renderizar();

    form.reset();
    definirFeedback(feedbackForm, `Encomenda ${encomenda.id} cadastrada com sucesso!`, 'ok');
    definirFeedback(feedbackCep, '');
  } catch (erro) {
    definirFeedback(feedbackForm, `Não foi possível cadastrar: ${erro.message}`, 'erro');
  }
});

/* Delegação de eventos nos cards (avançar status / excluir) */
listaCards.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;

  const card = botao.closest('.card');
  const id = card?.dataset.id;
  if (!id) return;

  const acao = botao.dataset.acao;

  if (acao === 'avancar') {
    const alterou = gerenciador.avancarStatus(id);
    if (alterou) {
      renderizar();
      definirFeedback(feedbackForm, `Status da encomenda ${id} atualizado.`, 'ok');
    }
  }

  if (acao === 'excluir') {
    const removeu = gerenciador.remover(id);
    if (removeu) {
      renderizar();
      definirFeedback(feedbackForm, `Encomenda ${id} removida.`, 'ok');
    }
  }
});

/* =====================================================================
   9) BOOTSTRAP DA APLICAÇÃO
   ===================================================================== */
popularModalidades();
renderizar();
