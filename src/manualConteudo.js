/* ═══════════════════════════════════════════════════════════
   MANUAL DO CONSULTOR — CONTEÚDO
   Magna Group Real Estate

   Este ficheiro tem SÓ TEXTO. Podes editar à vontade sem
   risco de partir a aplicação, desde que respeites:
     · as plicas invertidas ` no início e fim de cada bloco
     · nunca usar ` dentro do texto (usa aspas normais)
     · manter as vírgulas entre blocos

   Para acrescentar um bloco, copia um existente e muda o
   texto. Para esconder um bloco, apaga-o.
   ═══════════════════════════════════════════════════════════ */

/* ── ACESSOS ────────────────────────────────────────────────
   Que serviços cada consultor vê. Usa o email de login.
   Quem não estiver aqui vê apenas Ficha, Núcleo e Guião.
   Quem tiver role "admin" ou "diretor" vê sempre tudo.
   Serviços possíveis: vender · rentabilizar · adquirir ·
                       instalar · requalificar
   ─────────────────────────────────────────────────────────── */
export const ACESSOS = {
  // "consultor@magnagroup-re.com": ["vender", "rentabilizar"],
  // "outro@magnagroup-re.com":     ["requalificar"],
};

/* ── PREÇOS ─────────────────────────────────────────────────
   Alterar aqui muda em todo o manual.
   ─────────────────────────────────────────────────────────── */
export const PRECOS = {
  venda:            "5% — com IVA incluído",
  vendaBaixa:       "por definir",       // proposta: 3.000 € fixos até 60.000 €
  angariacaoArr:    "Uma renda, uma vez",
  gestaoPremium:    "25% da renda, todos os meses",
  alojamentoLocal:  "por definir",
  limiteObra:       "por definir",       // valor acima do qual é precisa autorização
};

/* ═══════════════════════════════════════════════════════════
   SEPARADORES
   ═══════════════════════════════════════════════════════════ */
export const SEPARADORES = [
  /* ─────────────────────────────────────────────────────────
     FICHA — o que se abre a meio de uma conversa
     ───────────────────────────────────────────────────────── */
  {
    id: "ficha",
    nome: "Ficha",
    sempre: true,
    secoes: [
      {
        label: "Reconhecer",
        titulo: "O que o cliente diz — e o que se propõe",
        intro: "Não decoras cinco serviços. Reconheces uma frase.",
        blocos: [
          { t: "Tabela de reconhecimento", tag: "Ficha", aberto: true, c: `
            <table>
              <tr><th>Se ouvires</th><th>Propõe</th></tr>
              <tr><td>"Está vazia há dois anos"</td><td><b>Rentabilizar</b> — rendimento sem decidir vender</td></tr>
              <tr><td>"Somos três irmãos e não nos entendemos"</td><td><b>Rentabilizar</b> — adia a decisão sem a forçar</td></tr>
              <tr><td>"Estou fora do país / longe daqui"</td><td><b>Rentabilizar</b> ou <b>Instalar</b> — a distância é a dor</td></tr>
              <tr><td>"Só vendo se for por X" (acima do mercado)</td><td><b>Requalificar</b> — ou o preço não sobe</td></tr>
              <tr><td>"Não consigo vender, falta a licença"</td><td><b>Requalificar</b> — e a venda vem a seguir</td></tr>
              <tr><td>"Fechei a varanda e não legalizei"</td><td><b>Requalificar</b></td></tr>
              <tr><td>"A cozinha está velha, o pessoal reclama"</td><td><b>Requalificar</b> — valorizar antes de vender</td></tr>
              <tr><td>"Ando à procura de algo para investir"</td><td><b>Adquirir</b> — com dossier de investimento</td></tr>
              <tr><td>"Comprei mas ainda não me mudei"</td><td><b>Instalar</b></td></tr>
              <tr><td>"Comprei noutra agência"</td><td><b>Instalar</b> ou <b>Requalificar</b> — vendem-se à mesma</td></tr>
              <tr><td>"Tenho uma casa que só uso no Verão"</td><td>Caretaker + <b>Rentabilizar</b> entre utilizações</td></tr>
              <tr><td>"Tenho de vender antes de comprar"</td><td><b>Vender</b> + <b>Adquirir</b> — os dois juntos</td></tr>
              <tr><td>"Ainda não falei com o banco"</td><td><b>Adquirir</b> — parceiros financeiros antes de ver casas</td></tr>
              <tr><td>Cliente estrangeiro, em qualquer fase</td><td><b>Internacional</b></td></tr>
            </table>` },
        ],
      },
      {
        label: "Números",
        titulo: "Preços",
        intro: "Saber de cor. Um consultor que hesita no preço perde a conversa.",
        blocos: [
          { t: "Tabela de preços", tag: "Preço", aberto: true, c: `
            <table>
              <tr><th>Serviço</th><th>Valor</th></tr>
              <tr><td><b>Venda</b></td><td>5% — com IVA incluído</td></tr>
              <tr><td><b>Venda abaixo de 60.000 €</b></td><td><span class="pend">por definir</span></td></tr>
              <tr><td><b>Angariação de Arrendamento</b><br><small>Encontrar e instalar o inquilino</small></td><td>Uma renda, uma vez</td></tr>
              <tr><td><b>Gestão de Arrendamento Premium</b><br><small>De ponta a ponta</small></td><td>25% da renda, todos os meses</td></tr>
              <tr><td><b>Alojamento local</b></td><td><span class="pend">por definir</span></td></tr>
            </table>` },
          { t: "Venda · a conta que ganha a angariação", tag: "Preço", c: `
            <p><b>5% com IVA incluído.</b> Nunca dizer "5% mais IVA".</p>
            <p>Numa venda de 250.000 € → <b>12.500 €</b>. Uma agência a "5% mais IVA" cobra 6,15% → <b>15.375 €</b>. Diferença de <b>2.875 €</b> sobre uma percentagem que parece igual.</p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"A nossa comissão é de 5%. É o valor final — já com IVA incluído. O número que lhe digo hoje é o número que sai da escritura."</p>
              <p>"Peça às outras agências o valor com IVA incluído. Vai perceber que a diferença não é a que parece."</p>
            </div>
            <p>Faz a conta à frente dele, com a calculadora. É o único argumento que a concorrência não iguala sem reduzir receita.</p>
            <div class="warn"><p><b>Nunca dizer "sem IVA" ou "não pagamos IVA".</b> A factura discrimina o IVA por obrigação legal. O que dizemos é que a percentagem anunciada já o inclui.</p></div>` },
          { t: "Gestão Premium · defender os 25%", tag: "Preço", c: `
            <p>Ele vai comparar com os 10% do mercado. <b>Não descontes — mostra a diferença e oferece a alternativa.</b></p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"Quem cobra 10% recebe a renda, tira a comissão e envia-lhe o resto. Quando houver uma avaria, telefona-lhe. Quando a quota subir, telefona-lhe. O trabalho continua a ser seu — só a cobrança é que não."</p>
              <p>"Se o que quer é só alguém que lhe encontre o inquilino, temos isso e custa uma renda. Depende do que quer fazer com o seu tempo."</p>
            </div>
            <p><b>Apresentar sempre os dois níveis.</b> Quem escolhe entre duas opções decide qual. Quem só ouve uma decide se aceita.</p>` },
          { t: "Os 25% não pagam os encargos — tratam deles", tag: "Preço", c: `
            <table>
              <tr><th></th><th>Trata</th><th>Paga</th></tr>
              <tr><td>Condomínio</td><td>Magna</td><td>Proprietário</td></tr>
              <tr><td>Seguros</td><td>Magna</td><td>Proprietário</td></tr>
              <tr><td>IMI</td><td>Magna avisa e trata</td><td>Proprietário</td></tr>
              <tr><td>Avarias</td><td>Magna coordena</td><td>Proprietário</td></tr>
              <tr><td>Declaração fiscal</td><td>Magna prepara dados</td><td>Contabilista dele</td></tr>
            </table>
            <p>Recebemos a renda, descontamos comissão e encargos, pagamos o que há a pagar, e transferimos o resto com relatório a explicar cada linha.</p>
            <div class="warn"><p><b>Obras acima de <span class="pend">[valor por definir]</span> exigem autorização prévia.</b> Obra de fundo é Requalificar, com orçamento próprio — não está incluída nos 25%.</p></div>` },
        ],
      },
      {
        label: "Serviços",
        titulo: "O que cada um inclui",
        intro: "Para responder quando perguntarem.",
        blocos: [
          { t: "Os cinco serviços", tag: "Ficha", c: `
            <p><b>Vender</b> — angariação, avaliação, comercialização, acompanhamento até à escritura.</p>
            <p><b>Rentabilizar</b> — dois níveis: Angariação de Arrendamento e Gestão de Arrendamento Premium. Mais alojamento local e caretaker.</p>
            <p><b>Adquirir</b> — acompanhamento de compra, jurídico interno, consultoria de investimento, parceiros financeiros.</p>
            <p><b>Instalar</b> — mudanças chave na mão, apoio à instalação, contratos e serviços, caretaker residencial.</p>
            <p><b>Requalificar</b> — projecto, especialidades, legalização, ampliação, requalificação, obra com equipa própria.</p>
            <p><b>O grupo</b> — aquisição directa de activos, financiamento e programas de apoio, engenharia e arquitectura próprias.</p>
            <div class="warn"><p>Podes dizer que estes serviços existem. <b>Não podes comprometer prazos, condições ou preços</b> sem confirmação prévia.</p></div>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     NÚCLEO COMUM
     ───────────────────────────────────────────────────────── */
  {
    id: "nucleo",
    nome: "Núcleo",
    sempre: true,
    secoes: [
      {
        label: "Base",
        titulo: "Os princípios",
        intro: "Valem para todos os serviços e todos os consultores. Não são negociáveis.",
        blocos: [
          { t: "A comissão é sempre com IVA incluído", tag: "Regra", c: `
            <p>O número que se diz é o número final. Nunca "X% mais IVA".</p>
            <p>O momento em que o cliente descobre o IVA é o momento em que a confiança se parte — normalmente depois da escritura, quando já não há nada a fazer. É o que transforma um bom processo num cliente que não volta.</p>
            <p>É o argumento mais forte que temos e é verificável. Nenhuma concorrente o iguala sem reduzir receita.</p>` },
          { t: "Responde-se no próprio dia", tag: "Regra", c: `
            <p>Sempre. Mesmo que seja para dizer que ainda não há resposta.</p>
            <p>Uma lead sem resposta em 24 horas está perdida, mesmo que continue no CRM. Quem pediu informação pediu-a normalmente a três sítios ao mesmo tempo — responde primeiro quem fica com o negócio.</p>` },
          { t: "Nada fica na cabeça", tag: "Regra", c: `
            <p>Se não está registado no CRM, não aconteceu.</p>
            <p>Contactos, visitas, valores discutidos, objecções ouvidas. É o que permite outro consultor pegar num processo, e é o que te protege quando um cliente disser que tinha combinado outra coisa.</p>` },
          { t: "Não se promete o que não se controla", tag: "Regra", c: `
            <p>Prazos de venda, preços finais, aprovações camarárias, decisões de bancos, serviços do grupo sem confirmação prévia.</p>` },
          { t: "Não se dá resposta jurídica ou fiscal", tag: "Limite", c: `
            <p>Usucapião, heranças indivisas, mais-valias, licenças em falta, contratos, despejos.</p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"É uma questão específica e não lhe quero dar uma resposta em cima do joelho. Temos jurista na empresa — deixe-me confirmar e digo-lhe com segurança até amanhã."</p>
            </div>
            <p>Encaminhar para a <b>Ana Costa</b>. Sempre.</p>` },
        ],
      },
      {
        label: "Comunicação",
        titulo: "Tom e limites",
        intro: "Como falamos, e o que nunca se diz.",
        blocos: [
          { t: "Como falamos", tag: "Tom", c: `
            <ul>
              <li><b>Directos, sem sermos secos.</b> Frases curtas, uma ideia de cada vez.</li>
              <li><b>Honestos mesmo quando custa.</b> Se a casa está cara, diz-se. É o que nos distingue e a razão pela qual os clientes voltam.</li>
              <li><b>Sem superlativos.</b> Um T2 com boa exposição é um T2 com boa exposição.</li>
              <li><b>Tratamento formal</b> até a pessoa passar ao informal.</li>
              <li><b>Português europeu.</b> Facto, contacto, projecto, activo, acção.</li>
            </ul>` },
          { t: "O que nunca se diz", tag: "Limite", c: `
            <div class="warn"><p><b>"Tenho um comprador para o seu imóvel."</b> Se não for literalmente verdade, é mentira — e é a mais comum do sector.</p></div>
            <div class="warn"><p><b>"Garanto que vendo em X meses."</b> Não se garante o que não se controla.</p></div>
            <div class="warn"><p><b>"Essa agência não presta."</b> Falamos do que fazemos, não do que os outros não fazem. O cliente escolheu-a; criticá-la é dizer-lhe que se enganou.</p></div>
            <div class="warn"><p><b>"Conhecemos lá gente."</b> Sobre autarquias, bancos ou seja quem for. O que temos é experiência, não influência.</p></div>
            <div class="warn"><p><b>Dados de outros clientes.</b> Além de má prática, é violação do RGPD — e a informação corre em bairros pequenos.</p></div>` },
          { t: "Discriminação — sem excepções", tag: "Limite", c: `
            <p>Na selecção de inquilinos e no atendimento a compradores, os critérios são <b>exclusivamente</b> capacidade financeira e documentação.</p>
            <p><b>Nunca</b> por nacionalidade, origem étnica, religião, orientação sexual, deficiência, ou por a pessoa ter filhos.</p>
            <div class="say"><div class="who">Se um proprietário pedir</div>
              <p>"Não posso fazer isso, e não é só uma questão minha: é ilegal e expõe-nos aos dois. O que faço é garantir-lhe que quem entra tem capacidade comprovada de pagar, e isso é o que realmente o protege."</p>
            </div>
            <p>Registar no CRM apenas critérios objectivos.</p>` },
        ],
      },
      {
        label: "Equipa",
        titulo: "Encaminhar",
        intro: "Um consultor especializado não perde o cliente quando o assunto sai da sua área. Passa-o bem.",
        blocos: [
          { t: "Para onde vai cada situação", tag: "Método", c: `
            <table>
              <tr><th>O cliente</th><th>Serviço</th></tr>
              <tr><td>Quer vender</td><td><b>Vender</b></td></tr>
              <tr><td>Tem imóvel parado ou quer rendimento</td><td><b>Rentabilizar</b></td></tr>
              <tr><td>Quer comprar, para viver ou investir</td><td><b>Adquirir</b></td></tr>
              <tr><td>Vai mudar-se, ou vem de fora</td><td><b>Instalar</b></td></tr>
              <tr><td>Precisa de obra ou tem processo por resolver</td><td><b>Requalificar</b></td></tr>
              <tr><td>Questão jurídica ou fiscal</td><td><b>Ana Costa</b></td></tr>
            </table>` },
          { t: "Como se passa sem parecer despacho", tag: "Método", c: `
            <div class="say"><div class="who">O que se diz</div>
              <p>"A partir daqui quem trata melhor disto é a [nome], que é quem trabalha esta área connosco. Apresento-vos e continuo a acompanhar — não desapareço do processo."</p>
            </div>
            <p><b>Quando o cliente vem do Instalar ou do Vender para o Requalificar</b>, o consultor de origem mantém-se como interlocutor e o Requalificar entra como executante.</p>
            <p>Um cliente que combinou tudo com uma pessoa e de repente tem três interlocutores conclui que foi passado adiante — mesmo quando o serviço corre bem.</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     GUIÃO OPERACIONAL
     ───────────────────────────────────────────────────────── */
  {
    id: "guiao",
    nome: "Guião",
    sempre: true,
    secoes: [
      {
        label: "Processo",
        titulo: "Da lead ao fecho",
        intro: "Um consultor não deve ter de decidir o que fazer a seguir. Deve saber.",
        blocos: [
          { t: "Os cinco estados do funil", tag: "CRM", aberto: true, c: `
            <table>
              <tr><th>Estado</th><th>Significa</th><th>Sai quando</th></tr>
              <tr><td><b>Novo</b></td><td>Entrou, ainda sem contacto</td><td>Houve contacto efectivo</td></tr>
              <tr><td><b>Contactado</b></td><td>Falámos e qualificámos</td><td>Há proposta concreta</td></tr>
              <tr><td><b>Proposta</b></td><td>Análise, contrato ou oferta em cima da mesa</td><td>Assinou ou recusou</td></tr>
              <tr><td><b>Fechado</b></td><td>Contrato assinado</td><td>—</td></tr>
              <tr><td><b>Perdido</b></td><td>Recusou ou ficou sem resposta</td><td>—</td></tr>
            </table>
            <p><b>Contactado significa que falaste com a pessoa.</b> Ligar e não atenderem não é contactado. Enviar mensagem sem resposta não é contactado.</p>` },
          { t: "Prazos — a folha para a parede", tag: "Prazos", aberto: true, c: `
            <table>
              <tr><th>Momento</th><th>Prazo</th></tr>
              <tr><td>Primeiro contacto após lead entrar</td><td><b>2 h · máx. 24</b></td></tr>
              <tr><td>Envio de imóveis após qualificar</td><td><b>24 h</b></td></tr>
              <tr><td>Análise de mercado após visita</td><td><b>48 h</b></td></tr>
              <tr><td>Seguimento de proposta</td><td><b>Dia 2 e dia 7</b></td></tr>
              <tr><td>Proposta sem resposta → Perdido</td><td><b>14 dias</b></td></tr>
              <tr><td>Contacto durante processo</td><td><b>Semanal</b></td></tr>
              <tr><td>Chamada após escritura</td><td><b>7 dias</b></td></tr>
              <tr><td>Pedido de referência</td><td><b>3 meses</b></td></tr>
            </table>` },
          { t: "Estado Novo · o primeiro contacto", tag: "Método", c: `
            <p><b>Prazo: menos de 2 horas em horário útil. Nunca mais de 24.</b></p>
            <p>Antes de ligar, dois minutos: ler o que a pessoa escreveu, ver o imóvel ou serviço, verificar se já existe registo dela.</p>
            <div class="say"><div class="who">Ao telefone</div>
              <p>"Boa tarde, [nome]? Fala [teu nome] da Magna Group Real Estate. Recebi agora o seu pedido sobre [assunto concreto]. Apanhei-o em boa altura?"</p>
            </div>
            <p><b>Se não atender:</b> uma chamada e mensagem a seguir. Nova tentativa em horário diferente no dia seguinte, e terceira ao terceiro dia. Sem resposta ao fim de três tentativas em dias e horas diferentes → Perdido, com motivo.</p>` },
          { t: "As quatro perguntas de qualificação", tag: "Método", c: `
            <p>Valem para qualquer lead, de qualquer serviço. Sem estas respostas, não se avança.</p>
            <ul>
              <li><b>O que o levou a procurar isto agora?</b> — a motivação real</li>
              <li><b>Tem algum prazo?</b> — a urgência</li>
              <li><b>A decisão é sua ou há mais pessoas?</b> — evita reuniões com quem não decide</li>
              <li><b>Já falou com mais alguém?</b> — a concorrência</li>
            </ul>
            <p>Um consultor que marca reuniões sem qualificar passa o mês em conversas que não fecham.</p>` },
          { t: "Estado Proposta · o seguimento", tag: "Método", c: `
            <p><b>Nenhuma proposta fica mais de 7 dias sem seguimento.</b> É aqui que se perde a maioria dos negócios que estavam ganhos — não por recusa, por silêncio.</p>
            <p><b>Dia 1</b> — enviar o que ficou combinado, no prazo prometido.</p>
            <p><b>Dia 2 ou 3</b> — "Só para confirmar que recebeu e perceber o que achou. Há alguma coisa que queira que eu esclareça?"</p>
            <div class="say"><div class="who">Dia 7</div>
              <p>"[nome], não quero estar a incomodar. Só preciso de saber se isto ainda faz sentido para si ou se prefere que deixe estar por agora — qualquer das respostas está bem para mim."</p>
            </div>
            <p>Dar a saída aumenta as respostas. Quem quer sair, sai — e liberta-te a agenda.</p>
            <p><b>Dia 14 sem resposta</b> → Perdido, com motivo registado.</p>` },
          { t: "Perdido não quer dizer acabado", tag: "Prazos", c: `
            <table>
              <tr><th>Motivo</th><th>Voltar</th><th>O que dizer</th></tr>
              <tr><td>Foi para outra agência</td><td>6 meses</td><td>"Ainda está para venda? Se quiser, digo-lhe o que faria diferente."</td></tr>
              <tr><td>Achou a comissão alta</td><td>3 meses</td><td>"Continua a tentar? Queria perceber como está a correr."</td></tr>
              <tr><td>Preço irrealista</td><td>4 meses</td><td>"Como está o mercado a reagir ao valor?"</td></tr>
              <tr><td>Decidiu não vender</td><td>12 meses</td><td>"Continua a fazer sentido manter?"</td></tr>
              <tr><td>Sem financiamento</td><td>6 meses</td><td>"Já conseguiu resolver a parte do crédito?"</td></tr>
            </table>
            <p>Quem volta seis meses depois com uma pergunta útil, e não com uma oferta, é lembrado.</p>` },
          { t: "Depois de fechar", tag: "Método", c: `
            <p><b>Sete dias depois</b>, chamada sem objectivo comercial: "Liguei só para saber como correu e se está tudo bem."</p>
            <p>Nesse contacto, verificar o segundo serviço. Um cliente que já assinou uma vez custa uma fracção do esforço de uma lead nova — é o número mais mal aproveitado em quase todas as agências.</p>
            <p><b>Três meses depois</b>, pedir referência: "Se conhecer alguém a pensar vender ou comprar, ficava-lhe grato que se lembrasse de mim. É assim que trabalho — não faço prospecção fria."</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     VENDER
     ───────────────────────────────────────────────────────── */
  {
    id: "vender",
    nome: "Vender",
    secoes: [
      {
        label: "Método",
        titulo: "A reunião de angariação",
        intro: "Em Portugal não falta quem queira comprar. Falta o que vender. Quem angaria, tem negócio.",
        blocos: [
          { t: "O erro que quase todos cometem", tag: "Método", aberto: true, c: `
            <p>Entrar a falar da Magna.</p>
            <p>O proprietário já ouviu três agências dizerem que são as melhores e que têm muitos compradores. Deixou de ouvir à segunda. Se começares por aí, és o quarto.</p>
            <p><b>Entra a perguntar.</b> O que descobres nos primeiros dez minutos é o que te permite fechar nos últimos dez.</p>` },
          { t: "Os cinco tempos", tag: "Método", c: `
            <p><b>1 · Percebe a situação, não o imóvel.</b> Antes de ver a casa: "O que é que o levou a decidir vender?" · "Tem prazo?" · "Está sozinho nesta decisão?"</p>
            <p>Quem vende por divórcio, herança ou mudança de emprego tem urgência e aceita conselhos. Quem vende "para ver quanto dá" não tem.</p>
            <p><b>2 · Vê a casa em silêncio.</b> Não elogies. Elogiar cedo custa caro quando tiveres de explicar o preço.</p>
            <p><b>3 · Devolve a leitura, com franqueza.</b> É aqui que se ganha a angariação.</p>
            <div class="say"><div class="who">Exemplo</div>
              <p>"Isto vende bem — a exposição solar e ser esquina fazem a diferença. O que vai travar visitas é a cozinha; não está má, compara mal com o que está no mercado nesta faixa de preço."</p>
            </div>
            <p>Ele está à espera de bajulação. Quando ouve uma avaliação honesta, percebe que estás a falar do interesse dele, não da tua comissão.</p>
            <p><b>4 · Apresenta caminhos, não serviços.</b> Vender como está · valorizar e vender (Requalificar) · arrendar com gestão (Rentabilizar). A conversa deixa de ser "contrato ou não" e passa a ser "qual dos três".</p>
            <p><b>5 · Fecha com um passo pequeno.</b> Se houver hesitação, não peças assinatura — pede para enviar a análise de mercado. Quem aceita recebê-la assina na maioria dos casos.</p>` },
          { t: "O preço", tag: "Método", c: `
            <p><b>Levar sempre comparáveis.</b> Três imóveis semelhantes vendidos ou à venda na zona, com valores. Sem isso é opinião contra opinião, e perde-se.</p>
            <p>Se o proprietário insistir num valor irrealista, há duas saídas honestas:</p>
            <ul>
              <li>Aceitar com calendário — "experimentamos três semanas ao seu preço e reavaliamos no dia [data]", com a data escrita no contrato</li>
              <li>Recusar — "ao preço que quer, não consigo prometer resultado. Prefiro não aceitar do que aceitar e falhar-lhe."</li>
            </ul>
            <p><b>A segunda ganha respeito e, com frequência, ganha o cliente umas semanas depois.</b></p>` },
        ],
      },
      {
        label: "Objecções",
        titulo: "As que aparecem sempre",
        intro: "Perceber o raciocínio, não decorar palavra a palavra.",
        blocos: [
          { t: "\"A agência X avaliou em mais vinte mil\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Acredito, e vou ser franco sobre o que isso costuma significar. Há agências que dão o preço que o senhor quer ouvir para ganhar o contrato, e depois passam quatro meses a pedir-lhe reduções. No fim vende abaixo do que teria vendido se tivesse entrado no preço certo — porque um imóvel parado há meio ano passa a ter fama de ter problema."</p>
              <p>"O preço que lhe dou é o que os dados dizem que se paga nesta zona e nesta tipologia. Se preferir experimentar mais alto durante três semanas, faço-o consigo — mas com calendário definido, não com esperança."</p>
            </div>
            <p>Não estás a dizer que a outra mentiu. Estás a explicar um mecanismo que ele desconhece, e a dar-lhe saída sem ter de admitir que errou.</p>` },
          { t: "\"Quanto levam de comissão?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"A nossa comissão é de 5%. É o valor final — já com IVA incluído. O número que lhe digo hoje é o número que sai da escritura."</p>
              <p>"Digo-lhe isto porque é onde a maioria das pessoas leva uma surpresa. Quase toda a gente anuncia a comissão sem IVA, e o proprietário faz contas com um número que não é o verdadeiro. Descobre no fim, quando já não há nada a fazer."</p>
              <p>"Peça às outras agências o valor com IVA incluído. Vai perceber que a diferença não é a que parece."</p>
            </div>
            <p>Se insistir na negociação: "A comissão é a mesma para todos os nossos clientes. Se a baixasse consigo, estaria a dizer-lhe que tinha um preço inventado — e isso devia preocupá-lo mais do que tranquilizá-lo."</p>` },
          { t: "\"Prefiro dar a várias agências\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Compreendo — parece que mais agências é mais exposição. Na prática é o contrário. Quando um imóvel está em cinco sítios com cinco preços, o comprador conclui que ninguém sabe quanto vale ou que há pressa. Nos dois casos, negoceia em baixa."</p>
              <p>"E há uma parte prática: nenhuma agência investe a sério num imóvel que pode ser vendido pela concorrente amanhã."</p>
            </div>` },
          { t: "\"Têm algum comprador para a minha casa?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Tenho pessoas na carteira à procura nesta zona e nesta faixa de preço. Não lhe vou dizer que tenho um comprador com o cheque na mão para a sua casa em concreto, porque não é verdade e ia perceber isso à terceira semana."</p>
            </div>
            <p><b>Esta resposta ganha angariações.</b> É a única frase da reunião que ele não ouviu das outras agências.</p>` },
          { t: "\"Eu próprio vendo, ponho num site\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Consegue, e há quem venda. Vale a pena saber o que costuma acontecer: vai receber curiosos, vizinhos e gente sem financiamento aprovado, sem forma de os filtrar antes de os ter dentro de casa. Depois negoceia sozinho com quem vem acompanhado. E no fim trata da parte documental — que é onde os negócios caem."</p>
              <p>"Faça uma coisa: experimente um mês. Se compensar, óptimo. Se não, ligue-me e eu pego onde estiver."</p>
            </div>
            <p>Nunca discutas com quem quer tentar sozinho. Dá o prazo e o contacto. Metade liga.</p>` },
          { t: "\"Já tenho contrato com outra agência\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Então não vou interferir — não trabalho assim. Quando termina? Deixe-me só o meu contacto. Se chegar ao fim sem estar vendido, ligue-me e conversamos sobre o que correu mal."</p>
            </div>
            <p>Nunca denigras a outra agência. Ele escolheu-a; criticá-la é dizer-lhe que se enganou.</p>` },
          { t: "\"Vou pensar / tenho de falar com a minha mulher\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Claro. Só uma pergunta para eu perceber: é sobre o preço, sobre o prazo, ou sobre trabalhar connosco?"</p>
            </div>
            <p>Quase sempre há uma objecção concreta escondida. Esta pergunta traz-na à superfície enquanto ainda estás na sala.</p>
            <p>Se for genuíno: "Prefere que eu volte quando estiverem os dois, para não ter de ser o senhor a explicar tudo outra vez?"</p>` },
          { t: "\"Não quero assinar seis meses\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Entendo. Os primeiros trinta dias são preparação — fotografia, posicionamento, apresentação à carteira. Um contrato curto de mais significa que investimos nisso e o imóvel sai antes de dar resultado."</p>
              <p>"Se a preocupação é ficar preso a quem não trabalha, ponho por escrito: se ao fim de [prazo] não estiver satisfeito, rescindimos sem discussão."</p>
            </div>` },
          { t: "\"Quanto tempo demora a vender?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Ao preço certo e nesta zona, imóveis como o seu têm andado entre [x] e [y] meses. Se entrarmos acima do mercado, some três ou quatro. Prefiro dizer-lhe isto agora do que daqui a seis meses."</p>
            </div>
            <p>Nunca dês um número que não podes cumprir.</p>` },
        ],
      },
      {
        label: "Depois",
        titulo: "Durante e depois do processo",
        intro: "",
        blocos: [
          { t: "Durante o processo", tag: "Método", c: `
            <p>Contacto <b>semanal</b>, mesmo sem novidades. "Não há desenvolvimentos esta semana" é uma actualização válida e evita a chamada ansiosa.</p>
            <p><b>Comunicar sempre o feedback das visitas</b>, incluindo o negativo. É o que prepara a conversa sobre ajuste de preço, quando ela tiver de acontecer.</p>
            <p>Nunca prometer ao comprador que o vendedor aceita, nem o contrário.</p>` },
          { t: "Depois da escritura", tag: "Método", c: `
            <table>
              <tr><th>Situação</th><th>Serviço</th></tr>
              <tr><td>Vendeu e ainda não comprou</td><td><b>Adquirir</b></td></tr>
              <tr><td>Vai mudar-se</td><td><b>Instalar</b></td></tr>
              <tr><td>Ficou com outro imóvel vazio</td><td><b>Rentabilizar</b></td></tr>
              <tr><td>Comprou casa a precisar de obra</td><td><b>Requalificar</b></td></tr>
            </table>` },
          { t: "O que não se responde", tag: "Limite", c: `
            <p>Encaminhar para a <b>Ana Costa</b>: heranças indivisas, usufruto, divisões de bens, divergências entre caderneta e registo, ónus, hipotecas, penhoras, mais-valias e questões fiscais.</p>
            <p>Licenças em falta → também <b>Requalificar</b>.</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     RENTABILIZAR
     ───────────────────────────────────────────────────────── */
  {
    id: "rentabilizar",
    nome: "Rentabilizar",
    secoes: [
      {
        label: "Serviço",
        titulo: "Os dois níveis",
        intro: "A diferença tem de ficar clara logo à primeira conversa.",
        blocos: [
          { t: "Angariação de Arrendamento · uma renda", tag: "Serviço", aberto: true, c: `
            <p>Encontrar e instalar o inquilino. E acaba aí.</p>
            <ul>
              <li>Preparação e publicação do anúncio</li>
              <li>Visitas</li>
              <li>Verificação de candidatos — rendimentos, situação profissional, referências</li>
              <li>Contrato de arrendamento</li>
              <li>Entrega de chaves e auto de estado</li>
            </ul>
            <p><b>A partir da entrega, o proprietário está sozinho.</b> Recebe a renda directamente, trata das avarias, fala com o inquilino e trata da parte fiscal.</p>
            <p><b>Para quem:</b> vive perto, tem tempo, e só precisa de ajuda a encontrar quem entra.</p>` },
          { t: "Gestão de Arrendamento Premium · 25% mensais", tag: "Serviço", aberto: true, c: `
            <p>O imóvel entregue a funcionar. O proprietário não faz nada. Inclui tudo o que está na Angariação, e depois:</p>
            <ul>
              <li>Recebimento e conferência da renda</li>
              <li><b>Transferência da renda já líquida</b>, com relatório mensal</li>
              <li>Gestão de avarias e assistências</li>
              <li>Interlocutor único para o inquilino — as chamadas são para nós</li>
              <li>Acompanhamento de condomínio</li>
              <li>Gestão de seguros, IMI e encargos</li>
              <li>Actualizações de renda e prazos contratuais</li>
              <li>Renovações, denúncias e substituição de inquilino</li>
              <li><b>Preparação dos dados fiscais anuais</b> para o contabilista do proprietário</li>
              <li>Vistorias periódicas ao imóvel</li>
            </ul>
            <p><b>Para quem:</b> proprietário ausente, emigrante, herdeiro, investidor, ou quem não quer lidar com isto.</p>` },
          { t: "O que os 25% não incluem", tag: "Limite", c: `
            <p><b>Não pagamos os encargos. Tratamos deles.</b> Condomínio, seguros, IMI e avarias continuam a ser pagos pelo proprietário — recebe a renda já líquida, com relatório a explicar cada linha.</p>
            <div class="warn"><p><b>Obras acima de <span class="pend">[valor por definir]</span> exigem autorização prévia.</b> Abaixo, resolvemos e informamos.</p></div>
            <div class="warn"><p><b>Obra de fundo é Requalificar</b>, com orçamento próprio. O que está incluído é a coordenação corrente e as assistências.</p></div>
            <div class="warn"><p><b>Preparamos os dados fiscais, não submetemos a declaração.</b> A submissão é acto do contabilista do proprietário.</p></div>` },
        ],
      },
      {
        label: "Método",
        titulo: "Qualificar e avaliar",
        intro: "",
        blocos: [
          { t: "As oito perguntas", tag: "Método", c: `
            <ul>
              <li>Onde é, que tipologia, em que estado?</li>
              <li>Está livre, arrendado ou ocupado?</li>
              <li>Há quanto tempo está sem rendimento?</li>
              <li>Já tentou arrendar? O que correu mal?</li>
              <li><b>Vive perto ou está fora?</b> → determina o nível a propor</li>
              <li>Precisa do rendimento ou é para não ter a casa parada?</li>
              <li><b>Tem licença de utilização?</b> → se não tiver, Requalificar antes de tudo</li>
              <li>É prédio com condomínio? → determina se o alojamento local é possível</li>
            </ul>
            <div class="warn"><p><b>Nunca dar valor de renda por telefone.</b> Sem ver o imóvel, qualquer número é inventado — e transforma-se numa promessa.</p></div>` },
          { t: "A renda de mercado", tag: "Método", c: `
            <p>O erro mais caro é aceitar a renda que o proprietário quer.</p>
            <p>Uma renda 10% acima do mercado não dá 10% a mais — dá dois ou três meses de casa vazia, que são 15 a 25% do rendimento anual perdido para sempre.</p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"A renda que pede não muda o que o mercado paga. Muda o tempo que a casa fica vazia à espera. Dois meses parada custam-lhe mais do que a diferença que estamos a discutir — e esse dinheiro não se recupera."</p>
            </div>` },
          { t: "Arrendamento ou alojamento local", tag: "Método", c: `
            <table>
              <tr><th></th><th>Arrendamento</th><th>Alojamento local</th></tr>
              <tr><td>Rendimento bruto</td><td>Menor</td><td>Maior</td></tr>
              <tr><td>Custos operacionais</td><td>Baixos</td><td>Altos</td></tr>
              <tr><td>Ocupação</td><td>Estável</td><td>Sazonal</td></tr>
              <tr><td>Risco principal</td><td>Incumprimento</td><td>Meses vazios</td></tr>
            </table>
            <div class="warn"><p><b>Nunca afirmar que um imóvel pode ser AL sem confirmar.</b> Há zonas de contenção, o condomínio pode impedir, e a regulamentação muda com frequência.</p></div>` },
          { t: "A selecção do inquilino", tag: "Método", c: `
            <ul>
              <li>Identificação e comprovativo de morada</li>
              <li>Situação profissional e comprovativos de rendimento</li>
              <li>Rácio renda / rendimento — regra habitual: renda até um terço</li>
              <li>Referências de senhorios anteriores</li>
              <li>Fiador quando o rácio não confortar</li>
            </ul>
            <div class="say"><div class="who">O que se diz</div>
              <p>"Não escolho o primeiro que aparece. Verifico rendimentos, situação profissional e referências, e apresento-lhe os candidatos com a informação toda. A decisão final é sua — eu dou-lhe a base para decidir."</p>
            </div>
            <div class="warn"><p><b>Selecção exclusivamente por capacidade financeira e documentação.</b> Ver Núcleo · Discriminação.</p></div>` },
        ],
      },
      {
        label: "Objecções",
        titulo: "As que aparecem sempre",
        intro: "",
        blocos: [
          { t: "\"25% é muito, a outra leva 10%\"", tag: "Objecção", c: `
            <p>Num arrendamento de 800 €, três anos: Angariação 800 € · Gestão Premium 7.200 €. Ele vai fazer esta conta.</p>
            <div class="say"><div class="who">Resposta</div>
              <p>"Não é gestão de arrendamento no sentido em que as outras agências usam a palavra. Quem cobra 10% recebe a renda, tira a comissão e envia-lhe o resto. Quando houver uma avaria, telefona-lhe. Quando a quota subir, telefona-lhe. O trabalho continua a ser seu — só a cobrança é que não."</p>
              <p>"Connosco recebe a renda já líquida, com relatório. Não trata do condomínio, não se lembra do IMI, não fala com o inquilino, e no fim do ano tem os dados prontos para o contabilista."</p>
              <p>"Se o que quer é só alguém que lhe encontre o inquilino, temos isso e custa uma renda. Depende do que quer fazer com o seu tempo."</p>
            </div>` },
          { t: "\"Prefiro tratar eu, é só receber a renda\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"É, quando corre bem. Vale a pena pensar em quando não corre. Um inquilino que deixa de pagar não sai porque o senhor pede. Há um processo legal, com prazos, e enquanto corre não entra renda e a casa está ocupada. A diferença entre esse processo começar bem ou mal está no contrato e em quem se deixou entrar."</p>
            </div>` },
          { t: "\"Já tive uma péssima experiência com inquilinos\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Acredito, e é mais comum do que se pensa. Posso perguntar como foi feita a selecção nessa altura?"</p>
            </div>
            <p>Deixar contar. Quase sempre revela que não houve selecção nenhuma.</p>
            <div class="say"><div class="who">Depois</div>
              <p>"Foi aí que se decidiu tudo. O problema não foi ter arrendado — foi a quem, e com que contrato."</p>
            </div>` },
          { t: "\"E se eu quiser vender daqui a um ano?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Não fica preso. E se quiser vender, vende connosco — com a vantagem de o imóvel estar arrendado, o que para um investidor é um argumento e não um obstáculo."</p>
            </div>
            <p><b>É uma oportunidade.</b> Um imóvel arrendado com contrato e histórico de pagamentos vende-se melhor a investidores do que um vazio.</p>` },
          { t: "\"Vocês pagam o IMI e o condomínio?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Não, esses encargos continuam a ser seus — o que fazemos é tratar deles. Recebe a renda já líquida e o relatório explica o que saiu. Não tem de se lembrar de datas nem de ter dinheiro parado à espera delas."</p>
            </div>` },
        ],
      },
      {
        label: "Depois",
        titulo: "A gestão corrente",
        intro: "É o único serviço onde o cliente nos avalia todos os meses.",
        blocos: [
          { t: "O ritmo", tag: "Método", c: `
            <p><b>Primeira semana de ocupação</b> — contacto para confirmar que correu bem dos dois lados.</p>
            <p><b>Todos os meses</b> — relatório na mesma data. Sempre. Um relatório atrasado vale menos do que um relatório fraco entregue a horas.</p>
            <p><b>Quando houver problema</b> — comunicar antes de o proprietário perguntar. Uma avaria comunicada por nós é serviço; descoberta por ele é falha.</p>
            <p><b>Uma vez por ano</b> — revisão: renda face ao mercado, estado do imóvel, intenções para o ano seguinte. É a conversa onde aparecem as vendas e as obras.</p>` },
          { t: "O que não se responde", tag: "Limite", c: `
            <p>Encaminhar para a <b>Ana Costa</b>: tipo e duração de contrato, actualização de rendas e prazos legais, denúncia, oposição à renovação, despejo, tributação de rendimentos prediais, contratos antigos, arrendamento de imóvel em herança indivisa.</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     ADQUIRIR
     ───────────────────────────────────────────────────────── */
  {
    id: "adquirir",
    nome: "Adquirir",
    secoes: [
      {
        label: "Base",
        titulo: "Dois clientes, duas conversas",
        intro: "Só têm em comum estarem a comprar.",
        blocos: [
          { t: "Comprador ou investidor", tag: "Base", aberto: true, c: `
            <p><b>O comprador</b> procura casa para viver. Decide com o estômago e justifica com a cabeça. Não nos paga — a comissão vem do lado do vendedor.</p>
            <p><b>O investidor</b> procura rendimento. Decide com números. Contrata-nos para procurar e analisar, e paga o serviço.</p>
            <p>Ao comprador que quer viver, uma folha de cálculo assusta. Ao investidor, entusiasmo sobre a luz da sala faz perder credibilidade em trinta segundos.</p>
            <div class="say"><div class="who">A pergunta que resolve</div>
              <p>"É para viver, para arrendar, ou ainda está a ponderar?"</p>
            </div>` },
        ],
      },
      {
        label: "Comprador",
        titulo: "Qualificar e acompanhar",
        intro: "",
        blocos: [
          { t: "A pergunta do financiamento", tag: "Método", aberto: true, c: `
            <p>É a mais importante e a que quase ninguém faz cedo.</p>
            <p><b>Um comprador sem crédito aprovado não é um comprador — é uma visita.</b> Passar três sábados a mostrar casas a quem não sabe se o banco lhe empresta é a forma mais eficaz de perder um mês.</p>
            <div class="say"><div class="who">Se ainda não tratou disso</div>
              <p>"Antes de vermos casas, vale a pena saber com o que pode contar — senão arriscamos apaixonar-se por uma coisa que depois não dá. Trabalhamos com parceiros financeiros que fazem essa análise em poucos dias e sem custo. Quer que o ponha em contacto?"</p>
            </div>
            <p>Quem aceita fica preso a nós.</p>` },
          { t: "Se tem casa para vender primeiro", tag: "Método", c: `
            <div class="say"><div class="who">O que se diz</div>
              <p>"Então há duas coisas a acontecer ao mesmo tempo, e a ordem importa. Quer que veja também a sua casa? Ter os dois processos em cima da mesa evita ficar preso a uma compra sem ter vendido, ou vender à pressa por já ter comprado."</p>
            </div>
            <p><b>Ligação directa ao Vender.</b> Metade dos compradores tem imóvel para vender e quase ninguém lho pergunta.</p>` },
          { t: "Apresentar imóveis", tag: "Método", c: `
            <p><b>Nunca mais de três.</b> Enviar dez é dizer que não se percebeu o que a pessoa quer. Em 24 horas após a qualificação, com uma linha a explicar cada escolha.</p>
            <div class="say"><div class="who">Exemplo</div>
              <p>"Este cumpre tudo o que me disse. Este fica 15 mil acima mas resolve a questão do estacionamento. Este é uma sugestão fora do que pediu — a zona é diferente, mas pela área e pelo preço achei que valia a pena mostrar-lhe."</p>
            </div>
            <p>A terceira é a que mais vezes se vende. Mostrar que se pensou vale mais do que mostrar volume.</p>` },
          { t: "Visitas e negociação", tag: "Método", c: `
            <ul>
              <li>Confirmar na véspera</li>
              <li>Chegar antes e verificar que está apresentável</li>
              <li>Deixar ver em silêncio antes de falar</li>
              <li>Não encher os silêncios — quem fala demais está a vender, e nota-se</li>
              <li>Perguntar no fim: <b>"o que é que o incomodou?"</b> — mais revelador do que "o que achou"</li>
            </ul>
            <p><b>Nunca transmitir uma proposta sem a enquadrar.</b> Uma proposta seca leva a uma recusa seca.</p>
            <div class="say"><div class="who">Como se enquadra</div>
              <p>"A proposta é de X. O que está por trás é isto: o comprador tem financiamento aprovado, não tem casa para vender, e pode escriturar em [prazo]. Se para si o que importa for o prazo, isto pode valer mais do que os Y que faltam."</p>
            </div>` },
        ],
      },
      {
        label: "Investidor",
        titulo: "Vendemos critério e análise",
        intro: "Aqui não vendemos imóveis.",
        blocos: [
          { t: "Definir o critério antes de procurar", tag: "Método", c: `
            <p>O erro é começar a enviar imóveis. Primeiro define-se o que se procura:</p>
            <ul>
              <li>Capital disponível — e se é próprio ou alavancado</li>
              <li>Objectivo — rendimento mensal, valorização, ou revenda a curto prazo</li>
              <li>Horizonte — quando quer o capital de volta</li>
              <li>Tolerância a obra — chave na mão ou aceita reabilitação</li>
              <li>Zonas aceitáveis — e se sai delas por melhor retorno</li>
              <li>Quer gerir ou quer que giram? → quase sempre <b>Rentabilizar</b></li>
            </ul>` },
          { t: "O que se apresenta", tag: "Método", c: `
            <p>Cada oportunidade analisada leva, no mínimo:</p>
            <ul>
              <li>Preço de aquisição e custo total real — <b>IMT, Selo, registos, escritura</b></li>
              <li>Estimativa de obra, quando aplicável</li>
              <li>Renda de mercado com comparáveis</li>
              <li>Rendimento líquido estimado</li>
              <li>Cenários: manter e arrendar, ou revender</li>
            </ul>
            <p><b>Usar sempre o gerador de dossier de investimento do CRM.</b> Um investidor que recebe números feitos à mão num email não volta.</p>
            <div class="warn"><p><b>Um terreno não tem yield de arrendamento.</b> Para terrenos, os cenários são revenda directa ou construir e vender — nunca rentabilidade de renda.</p></div>` },
          { t: "Como se fala com um investidor", tag: "Tom", c: `
            <p>Sem adjectivos. Sem "óptima oportunidade". Números e a sua leitura.</p>
            <div class="say"><div class="who">Exemplo</div>
              <p>"A esta rentabilidade, e nesta zona, este imóvel é razoável mas não é excepcional. O que o torna interessante é [factor concreto]. O risco é [risco concreto]. Se o que procura for rendimento estável, prefiro o outro; se procura valorização, este."</p>
            </div>
            <p><b>Dizer que um negócio não é bom é o que constrói a relação.</b> Um investidor recorrente vale dezenas de compradores.</p>` },
        ],
      },
      {
        label: "Objecções",
        titulo: "As que aparecem sempre",
        intro: "",
        blocos: [
          { t: "\"Vocês trabalham para o vendedor, não para mim\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Trabalho para que o negócio se faça, e um negócio só se faz se ambos ficarem satisfeitos. Sou pago pelo lado do vendedor, é verdade, e digo-lho abertamente. Mas se lhe vender uma casa que não lhe serve, perco o senhor e perco quem o senhor conhece — que é como este trabalho funciona a sério."</p>
            </div>` },
          { t: "\"Está muito caro para o que é\"", tag: "Objecção", c: `
            <p>Nunca defender o preço por reflexo.</p>
            <div class="say"><div class="who">Resposta</div>
              <p>"Pode estar. Deixe-me mostrar-lhe o que se vendeu na zona nos últimos meses, e depois diz-me o que acha. Se estiver acima do mercado, faz sentido fazermos uma proposta que o reflicta."</p>
            </div>` },
          { t: "Investidor · \"Consigo melhor rentabilidade noutro lado\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Provavelmente sim, e vale a pena olhar. A rentabilidade alta costuma vir com uma de três coisas: zona com pouca procura, imóvel a precisar de obra, ou inquilino difícil de substituir. Se souber qual das três está a comprar, a decisão é sua e é informada."</p>
            </div>` },
          { t: "Investidor · \"Não quero pagar consultoria, procuro sozinho\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Pode. A diferença é o tempo e o que não vê. A maior parte do que analisamos não chega aos portais — vem da carteira e de contactos. E a análise é o que o impede de comprar um activo que parece bom em bruto e não é em líquido."</p>
            </div>` },
        ],
      },
      {
        label: "Limites",
        titulo: "O que nunca se diz",
        intro: "",
        blocos: [
          { t: "Limites", tag: "Limite", c: `
            <div class="warn"><p><b>"Este imóvel é um bom investimento."</b> Sem análise feita, é opinião — e se correr mal, foi nossa.</p></div>
            <div class="warn"><p><b>"O senhorio aceita X."</b> Nunca antes de ele o dizer.</p></div>
            <div class="warn"><p><b>"O banco vai aprovar."</b> Não decidimos nós.</p></div>
            <div class="warn"><p><b>Rentabilidades sem base.</b> Todo o número apresentado vem do dossier de investimento.</p></div>
            <div class="warn"><p><b>Comparações com produtos financeiros.</b> Não somos intermediários financeiros.</p></div>` },
          { t: "O acompanhamento jurídico", tag: "Método", c: `
            <p>É o argumento mais forte deste serviço e o menos usado.</p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"Todo o processo é acompanhado juridicamente por nós — temos jurista na empresa. Certidões, ónus, licenças, o contrato-promessa e as condições suspensivas. Não é um extra que se contrata à parte, faz parte."</p>
            </div>
            <p><b>Porque importa:</b> é onde os negócios caem. Não na negociação — na papelada.</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     INSTALAR
     ───────────────────────────────────────────────────────── */
  {
    id: "instalar",
    nome: "Instalar",
    secoes: [
      {
        label: "Base",
        titulo: "Instalar uma pessoa na casa dela",
        intro: "Mudanças, contratos e serviços, presença por quem não pode estar.",
        blocos: [
          { t: "O que é e o que não é", tag: "Base", aberto: true, c: `
            <p>Mudanças chave na mão, caretaker residencial, apoio à instalação — contratos de água, luz, gás e comunicações, inscrições, orientação nos primeiros meses.</p>
            <p><b>Não inclui obra.</b> Tudo o que envolva pintar, alterar, ampliar ou licenciar é <b>Requalificar</b>. Mas o cliente continua a falar contigo.</p>
            <p><b>Vende-se a quem não comprou connosco.</b> É o único serviço que não depende de haver transacção — e é frequentemente a porta de entrada para tudo o resto.</p>
            <p><b>É o que fica na memória.</b> Uma escritura esquece-se. Uma mudança que correu bem lembra-se durante anos e conta-se a outros.</p>` },
          { t: "Os clientes", tag: "Base", c: `
            <p><b>Quem comprou connosco</b> — propor <b>antes</b> da escritura: "Já pensou como vai fazer a mudança? Se quiser, tratamos disso."</p>
            <p><b>Quem comprou noutro lado</b> — "Não fomos nós que lhe vendemos a casa, e não faz diferença nenhuma."</p>
            <p><b>Quem se muda para longe</b> — é onde o serviço vale mais e onde a disposição para pagar é maior.</p>
            <p><b>Quem chega do estrangeiro</b> — meia hora para nós, uma semana de frustração para ele. → Internacional</p>
            <p><b>Segunda habitação</b> — o que preocupa é o que acontece nos meses vazios. Se puder ser arrendada entre utilizações, → Rentabilizar.</p>` },
          { t: "Qualificar", tag: "Método", c: `
            <ul>
              <li>O que precisa e para quando?</li>
              <li>Já tem a chave ou está em processo?</li>
              <li>Vai estar presente ou trata tudo à distância?</li>
              <li>A casa precisa de intervenção antes de entrar? → Requalificar entra por trás</li>
              <li>Vem de outro país? → Internacional</li>
              <li>É primeira habitação ou casa de férias?</li>
            </ul>
            <div class="warn"><p><b>Nunca orçamentar mudança por telefone.</b> Ver a casa: volume, andar, elevador, acesso para camião, restrições de condomínio. Um valor dado ao telefone vira expectativa.</p></div>` },
        ],
      },
      {
        label: "Obra",
        titulo: "Quando é precisa obra",
        intro: "O cliente é teu e continua teu. Requalificar entra como executante, não como substituto.",
        blocos: [
          { t: "A regra · falas sempre tu, decide sempre o técnico", tag: "Regra", aberto: true, c: `
            <p>Tu manténs a relação, marcas, acompanhas e comunicas. Os prazos, os preços e a viabilidade vêm do chefe de obra ou dos técnicos — nunca de ti.</p>
            <div class="say"><div class="who">O que dizes</div>
              <p>"Isso é obra, e temos equipa própria para isso. Vou pedir que passem cá para ver e trago-lhe um orçamento. Continuo a ser eu a acompanhar — não vai ter de falar com meio mundo."</p>
            </div>
            <p><b>O que fazes:</b> recolhes o que ele quer e fotografas · passas ao Requalificar com a informação completa · marcas a visita técnica e estás presente · o orçamento vem dos técnicos e é entregue por ti · durante a obra, és tu quem dá notícias.</p>
            <div class="warn"><p><b>Se a intervenção alterar áreas, estrutura ou exigir licença</b>, o processo passa a ser conduzido pelo Requalificar e tu ficas como ponto de contacto. Não tentes gerir um processo camarário.</p></div>` },
          { t: "O que nunca dizes", tag: "Limite", c: `
            <div class="warn"><p><b>Um preço de obra.</b> Nem aproximado, nem "à volta de".</p></div>
            <div class="warn"><p><b>Um prazo.</b> Nem "é rápido".</p></div>
            <div class="warn"><p><b>"Isso resolve-se com uma pintura."</b> Uma humidade não é uma pintura.</p></div>
            <div class="warn"><p><b>"Isso faz-se sem licença."</b> Não decides tu.</p></div>` },
        ],
      },
      {
        label: "Objecções",
        titulo: "As que aparecem sempre",
        intro: "",
        blocos: [
          { t: "\"Isso eu trato, é só chamar uma empresa de mudanças\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Pode ser, se estiver cá para coordenar. O que fazemos é a parte que não é o camião: falar com o condomínio, reservar o lugar, garantir que as chaves estão onde têm de estar, e estar presente no dia. Se estiver a mudar-se de longe ou a trabalhar, é isso que costuma correr mal."</p>
            </div>` },
          { t: "\"Quanto custa?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Depende do volume e dos acessos, e não lhe quero dar um número por telefone que depois não se confirme. Passo por lá, vejo, e no dia seguinte tem um valor fechado."</p>
            </div>` },
          { t: "\"Isso é para quem tem dinheiro\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"É um serviço, e como qualquer serviço custa. A pergunta é se lhe compensa: o que lhe vale um dia de trabalho perdido, três deslocações e o risco de correr mal? Se compensar, faz sentido; se não, digo-lho eu."</p>
            </div>` },
          { t: "\"Já tenho quem me trate disso\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Então é o mais simples. Se em alguma altura precisar de alguém presente por si, diga."</p>
            </div>
            <p>Não competir com quem já tem alguém de confiança. Insistir só estraga a relação.</p>` },
        ],
      },
      {
        label: "Depois",
        titulo: "O contacto que gera referências",
        intro: "",
        blocos: [
          { t: "No dia seguinte à mudança", tag: "Método", c: `
            <div class="say"><div class="who">Chamada</div>
              <p>"Boa tarde, liguei só para saber se correu tudo bem e se ficou alguma coisa por resolver."</p>
            </div>
            <p><b>É o contacto com melhor retorno de todo o manual.</b> A pessoa acabou de passar por um dia difícil e alguém ligou a perguntar — é isso que se conta a outros.</p>
            <p><b>Passadas duas semanas</b>, verificar: ainda tem casa por vender (Vender) · a casa antiga vai ficar vazia (Rentabilizar) · obra por fazer (Requalificar) · está a ponderar comprar mais (Adquirir).</p>` },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────
     REQUALIFICAR
     ───────────────────────────────────────────────────────── */
  {
    id: "requalificar",
    nome: "Requalificar",
    secoes: [
      {
        label: "Base",
        titulo: "A advertência vem primeiro",
        intro: "Toda a intervenção física no imóvel. Se envolve arquitectura, especialidades ou equipas de obra, é aqui.",
        blocos: [
          { t: "Nem tudo é legalizável", tag: "Limite", aberto: true, c: `
            <p>Há construções em Reserva Ecológica ou Agrícola Nacional, em leito de cheia, em servidão, ou em desconformidade com o plano director municipal que <b>não se regularizam</b> — e nenhuma competência técnica muda isso.</p>
            <p>Por essa razão o serviço não se chama legalizar, e <b>nunca se promete legalização</b>. O que se promete é uma <b>resposta</b>:</p>
            <div class="say"><div class="who">O que se diz</div>
              <p>"Não lhe consigo dizer hoje se é legalizável. Consigo dizer-lhe que vamos olhar para os documentos e para o enquadramento, e que dentro de [prazo] tem uma posição escrita: é possível, é possível com alterações, ou não é. Se não for, digo-lho com a mesma clareza."</p>
            </div>
            <div class="warn"><p>Um consultor que promete legalização e falha <b>destrói mais valor do que os negócios que ganhou por prometer</b>. Estas conversas correm em bairros pequenos.</p></div>` },
          { t: "Porque é que este serviço existe", tag: "Base", c: `
            <p>A maioria das agências disputa os mesmos imóveis: prontos a vender, documentação em ordem, três concorrentes antes de nós. Este serviço chega aos outros.</p>
            <p><b>Uma casa sem licença de utilização não se vende com financiamento e não se hipoteca.</b> O proprietário tem património imobilizado e já ouviu de duas agências que não há nada a fazer.</p>
            <p>Quem lhe dá uma resposta — mesmo negativa — fica com a relação. E quem resolve fica com a venda a seguir, sem concorrência.</p>
            <p><b>Entramos a resolver, não a pedir exclusivo.</b></p>` },
          { t: "O que a Magna tem", tag: "Base", c: `
            <ul>
              <li><b>Arquitectura</b> — engenheiro que elabora e assina o projecto</li>
              <li><b>Especialidades</b> — engenheiro que elabora e assina</li>
              <li><b>Execução</b> — chefe de obra com equipas próprias</li>
              <li><b>Conhecimento autárquico</b> — os técnicos trabalham há anos com várias câmaras</li>
            </ul>
            <p>O que separa um processo de oito meses de um de dois anos raramente é o projecto. É saber como aquela câmara instrui e onde os processos ficam parados.</p>
            <div class="warn"><p><b>Nunca traduzir isto como "conhecemos lá gente".</b> O que temos é experiência processual, não influência. Sugerir o contrário é grave.</p></div>` },
        ],
      },
      {
        label: "Trabalhos",
        titulo: "Os quatro trabalhos",
        intro: "",
        blocos: [
          { t: "R1 · Casa sem licença de utilização", tag: "Cliente", c: `
            <p>Herdou, comprou há décadas, ou construiu sem processo concluído. Descobriu ao tentar vender ou hipotecar.</p>
            <p><b>Sente</b> frustração e alguma vergonha. Já lhe disseram que não tem solução.</p>
            <p><b>Onde acaba:</b> venda desbloqueada, património hipotecável — ou uma resposta negativa dada com clareza, que também tem valor.</p>` },
          { t: "R2 · Ampliação ou alteração por regularizar", tag: "Cliente", c: `
            <p>Fechou uma varanda, acrescentou um piso, transformou o sótão, construiu um anexo.</p>
            <p><b>Sente</b> desconforto antigo que vai adiando.</p>` },
          { t: "R3 · Requalificação para valorizar antes de vender", tag: "Cliente", c: `
            <p>Quer vender e o imóvel compara mal com o mercado.</p>
            <p><b>Sente</b> que vai "gastar dinheiro para dar ao comprador".</p>
            <p><b>É o único dos quatro em que somos nós a propor.</b> Nasce quase sempre de uma visita de angariação, quando o consultor do Vender percebe que a cozinha ou as casas de banho estão a travar o preço.</p>` },
          { t: "R4 · Obra de adaptação antes de entrar", tag: "Cliente", c: `
            <p>Comprou e quer adaptar antes de se mudar. Muitas vezes vive longe.</p>
            <p><b>Sente</b> receio de gerir obra à distância e de ser aldrabado por quem não conhece.</p>
            <p>Chega quase sempre pelo <b>Instalar</b> — nesse caso o consultor do Instalar mantém-se como a cara do processo.</p>` },
        ],
      },
      {
        label: "Método",
        titulo: "O que se recolhe e o que se diz",
        intro: "",
        blocos: [
          { t: "As sete perguntas", tag: "Método", aberto: true, c: `
            <p><b>Nenhuma se responde por ti</b> — recolhes e levas aos técnicos.</p>
            <ul>
              <li>O que consta na caderneta predial e na conservatória?</li>
              <li>A construção é anterior a 1951? — regime diferente</li>
              <li>Tem projecto aprovado na câmara, mesmo que a obra não corresponda?</li>
              <li>Que câmara é?</li>
              <li>Está em zona condicionada? — REN, RAN, servidões, leito de cheia, área protegida, zona histórica</li>
              <li>Há contra-ordenação ou processo em curso?</li>
              <li>O que motiva a resolver isto agora?</li>
            </ul>
            <p>Para R3 e R4 acrescenta-se: o que o cliente quer fazer, com fotografias.</p>` },
          { t: "A primeira conversa", tag: "Método", c: `
            <div class="say"><div class="who">O que se diz</div>
              <p>"O que lhe posso dizer com segurança é que situações destas se avaliam — e que a única forma de saber a sua é olhar para os documentos e para o enquadramento do terreno. Temos engenharia e arquitectura na empresa, e os técnicos que assinam trabalham há anos com câmaras da zona."</p>
              <p>"Recolho a documentação, levo aos técnicos, e volto com uma posição concreta. Se não for viável, digo-lhe também — e não lhe custa nada tê-lo tentado."</p>
            </div>
            <p><b>Não prometes resultado. Prometes uma resposta.</b> E a resposta é exactamente o que ninguém lhe deu até agora.</p>` },
          { t: "O que nunca se diz", tag: "Limite", c: `
            <div class="warn"><p><b>"Isso legaliza-se."</b> Depende do plano director, da zona, do que foi construído e da câmara.</p></div>
            <div class="warn"><p><b>"Demora X meses."</b> Os prazos camarários não se controlam.</p></div>
            <div class="warn"><p><b>"Fica por X euros."</b> Só depois de os técnicos verem.</p></div>
            <div class="warn"><p><b>Qualquer interpretação do PDM ou da lei.</b> Recolhes, não interpretas.</p></div>` },
          { t: "O processo", tag: "Método", c: `
            <p><b>1 · Recolha documental</b> — caderneta, certidão permanente, plantas, processo camarário.</p>
            <p><b>2 · Análise de viabilidade</b> — posição escrita: viável, viável com alterações, ou inviável.</p>
            <p><b>3 · Proposta</b> — âmbito, honorários, taxas e prazo estimados, com a nota de que prazos camarários não são controláveis.</p>
            <p><b>4 · Projecto</b> — arquitectura e especialidades assinados pelos nossos técnicos.</p>
            <p><b>5 · Instrução e acompanhamento</b> — submissão, resposta a pedidos de elementos, até decisão.</p>
            <p><b>6 · Obra</b> — quando aplicável, com equipa e chefe de obra próprios.</p>
            <p><b>7 · Conclusão</b> — situação regularizada ou obra entregue.</p>
            <p>Para R3 e R4 sem licenciamento, salta as fases 2 e 5.</p>` },
          { t: "Quando o cliente vem de outro serviço", tag: "Regra", c: `
            <p><b>O cliente é de quem o trouxe. Nós somos os executantes.</b></p>
            <ul>
              <li>O consultor de origem mantém-se como interlocutor</li>
              <li>Nós fazemos a visita técnica, o orçamento e a obra</li>
              <li>O orçamento é entregue <b>por ele</b>, não por nós</li>
              <li>Durante a obra, as notícias vão ao cliente <b>através dele</b></li>
            </ul>
            <p>Um cliente que combinou tudo com uma pessoa e de repente tem três interlocutores conclui que foi passado adiante — mesmo quando o serviço corre bem.</p>` },
        ],
      },
      {
        label: "Objecções",
        titulo: "As que aparecem sempre",
        intro: "",
        blocos: [
          { t: "\"Já me disseram que não tem solução\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Pode ser que não tenha, e nesse caso serei eu a dizer-lho. Mas quem lho disse viu os documentos e o enquadramento, ou disse-o de memória? A diferença entre um caso sem solução e um caso mal instruído é grande, e só se sabe olhando."</p>
            </div>` },
          { t: "\"Isso vai custar uma fortuna\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Vai custar. A pergunta é o que custa não fazer. Uma casa sem licença não vende com financiamento — reduz os compradores àqueles que pagam a pronto, e esses negoceiam em baixa. A diferença entre vender regularizado e vender como está costuma ser muito superior ao custo do processo."</p>
            </div>` },
          { t: "\"Não tenho pressa, fica para depois\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Compreendo. Duas notas para ter em conta: os processos não ficam mais fáceis com o tempo, e há alterações a regulamentos que podem tornar hoje possível o que amanhã não será. E se um dia precisar de vender com urgência — herança, divórcio, doença — vai ter de o fazer no pior momento possível."</p>
            </div>` },
          { t: "\"Prefiro tratar com um arquitecto directamente\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Faz sentido e é uma opção legítima. A diferença é que um arquitecto entrega-lhe o projecto; a partir daí é o senhor que trata do processo, dos pedidos de elementos e depois da obra. Connosco é tudo a mesma pessoa a responder-lhe."</p>
              <p>"Se preferir ir por essa via, com franqueza: peça que o processo lhe seja entregue instruído e não apenas desenhado. É aí que a maioria fica parada."</p>
            </div>` },
          { t: "\"E se no fim não passar?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"É uma possibilidade real e não lhe vou dizer que não existe. É por isso que a primeira fase é uma análise de viabilidade antes de haver investimento significativo — para saber se vale a pena avançar antes de gastar a sério."</p>
            </div>` },
          { t: "R3 · \"Estou a gastar dinheiro para dar ao comprador\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Só se gastar no sítio errado. Há intervenções que se pagam a si próprias no preço final e outras que não se recuperam. Digo-lhe quais são as duas coisas — e se concluir que não compensa, também lho digo."</p>
            </div>` },
          { t: "\"Quanto vale a casa depois?\"", tag: "Objecção", c: `
            <div class="say"><div class="who">Resposta</div>
              <p>"Consigo dizer-lhe com dados. Fazemos avaliação de mercado — é o nosso trabalho principal. Digo-lhe quanto vale hoje como está e quanto valeria intervencionada. A decisão fica sua."</p>
            </div>
            <p><b>É a melhor pergunta que te podem fazer.</b> Liga o Requalificar ao Vender na mesma conversa, sem teres de empurrar nada.</p>` },
        ],
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   FICHA DO CLIENTE — o A4 que se deixa em cima da mesa
   ═══════════════════════════════════════════════════════════ */
export const FICHA_CLIENTE = [
  { verbo: "Vender", lead: "Ao preço certo, no tempo certo.",
    texto: "Avaliação com dados de mercado, comercialização e acompanhamento até à escritura, com assessoria jurídica interna. Comissão de 5% — valor final, já com IVA incluído." },
  { verbo: "Rentabilizar", lead: "O imóvel trabalha. O proprietário descansa.",
    texto: "Duas formas de arrendar. <b>Angariação</b> — encontramos, verificamos e instalamos o inquilino; o custo é uma renda. <b>Gestão Premium</b> — tratamos de tudo: renda, avarias, condomínio, seguros, prazos e dados fiscais anuais. Recebe a renda já líquida, com relatório mensal." },
  { verbo: "Adquirir", lead: "Comprar com critério.",
    texto: "Acompanhamento de compra com assessoria jurídica incluída — não é um extra. Para quem compra para rentabilizar, consultoria de investimento com análise de custos, rendimento e cenários." },
  { verbo: "Instalar", lead: "Da chave na porta à última caixa arrumada.",
    texto: "Mudanças chave na mão, contratos de água, luz e comunicações, e acompanhamento dos primeiros meses. Para quem se muda de longe, ou vem de outro país." },
  { verbo: "Requalificar", lead: "Projecto, obra e processos.",
    texto: "Arquitectura e especialidades próprias, equipas de obra e acompanhamento de processos camarários. Requalificação para valorizar, obras de adaptação, e regularização de situações por resolver." },
];
