"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dices,
  Map,
  MessageCircle,
  Music2,
  Radio,
  ScrollText,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

type TutorialStep = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  actions: string[];
  tip: string;
};

const steps: TutorialStep[] = [
  {
    icon: BookOpen,
    eyebrow: "Primeiros passos",
    title: "Crie ou escolha uma campanha",
    description: "O Salão de Campanhas é a página inicial depois do login. Cada campanha guarda seus próprios jogadores, fichas, mapa, pinos e rolagens.",
    actions: [
      "Clique em Criar campanha para abrir uma nova mesa como mestre.",
      "Escolha uma campanha existente para continuar uma aventura.",
      "Clique no nome da campanha, no topo da mesa, para voltar ao salão.",
    ],
    tip: "Se você criar a campanha, receberá automaticamente as ferramentas de mestre.",
  },
  {
    icon: Users,
    eyebrow: "Jogar com amigos",
    title: "Convide seu grupo",
    description: "O mestre pode gerar um link e um código de convite exclusivos para a campanha.",
    actions: [
      "Na mesa, use Convidar jogadores no menu do mestre ou o botão Convidar no topo.",
      "Copie o link e envie para seus amigos.",
      "O jogador entra com Google e confirma o código no Salão de Campanhas.",
    ],
    tip: "O mesmo convite pode ser reutilizado pelos integrantes do seu grupo fechado.",
  },
  {
    icon: ScrollText,
    eyebrow: "Seu aventureiro",
    title: "Crie e mantenha sua ficha",
    description: "Cada jogador possui uma ficha diferente em cada campanha, vinculada à própria conta.",
    actions: [
      "Clique em Criar ficha ou Minha ficha.",
      "Preencha nome, ancestralidade, classe, nível, vida e armadura.",
      "Envie uma imagem do computador ou cole um link público para usá-la também no pino.",
      "Configure atributos, perícias e inventário e clique em Salvar ficha.",
    ],
    tip: "Ao salvar a ficha pela primeira vez, seu pino também é criado automaticamente no mapa.",
  },
  {
    icon: Dices,
    eyebrow: "Rolagens em tempo real",
    title: "Use o oráculo de dados",
    description: "Todas as pessoas da campanha acompanham as rolagens em tempo real no painel à direita.",
    actions: [
      "Escolha d4, d6, d8, d10, d12, d20 ou d100 e quantos dados serão lançados.",
      "Escolha se o resultado usa o maior dado, o menor dado ou a soma de todos.",
      "Defina o modificador, clique em Rolar e acompanhe todos os valores no histórico.",
    ],
    tip: "O modificador é aplicado uma vez, depois de selecionar o maior, o menor ou somar os dados.",
  },
  {
    icon: Map,
    eyebrow: "Mapa compartilhado",
    title: "Mova pinos e explore a cena",
    description: "O mapa, a grade e a posição de cada pino são sincronizados para todo o grupo.",
    actions: [
      "Arraste o pino da sua personagem para movimentá-la.",
      "Use os controles para aumentar o zoom, restaurar a visão ou ocultar a grade.",
      "Com a neblina ativa, você verá a área iluminada ao redor dos pinos do grupo.",
      "Jogadores movem o próprio pino; o mestre pode mover todos os pinos.",
      "O mestre abre os controles de visão para ajustar todos ou clica em um pino para alterar apenas aquele jogador.",
    ],
    tip: "As posições são salvas automaticamente quando você solta o pino.",
  },
  {
    icon: Crown,
    eyebrow: "Ferramentas do mestre",
    title: "Prepare mapas e criaturas",
    description: "Quem criou a campanha controla a cena ativa e os pinos de monstros.",
    actions: [
      "Abra Preparar cena no menu Mestre.",
      "Defina o nome da cena, o tamanho da grade e uma imagem pública do Google Drive.",
      "Escolha como a imagem se ajusta e ative a neblina de guerra com o raio desejado.",
      "Crie pontos de iluminação, ajuste cor, alcance e intensidade e arraste-os no mapa.",
      "Use a barra abaixo de Adicionar ponto de luz para escolher o tamanho da próxima área iluminada.",
      "No mapa, ative o botão de luz e clique nos lugares que deseja revelar.",
      "Adicione criaturas com nome e imagem e use Revelação para mostrar pistas ao grupo.",
    ],
    tip: "No Google Drive, deixe a imagem como “qualquer pessoa com o link” para que todos consigam vê-la.",
  },
  {
    icon: MessageCircle,
    eyebrow: "Conversa da sessão",
    title: "Compartilhe mensagens e imagens",
    description: "O chat mantém as 100 mensagens mais recentes da sessão sincronizadas com todos os integrantes da campanha.",
    actions: [
      "Abra Chat da sessão no menu ou use o botão Chat no topo.",
      "Escreva uma mensagem ou selecione uma imagem JPG, PNG, WebP ou GIF de até 4 MB.",
      "Enter envia a mensagem; Shift+Enter cria uma nova linha.",
      "Marque uma imagem como spoiler para ocultá-la até cada jogador clicar.",
      "As imagens ficam na pasta do Google Drive configurada para o RPGcord.",
      "O mestre pode apagar o histórico temporário usando o ícone da lixeira.",
    ],
    tip: "Use o chat para compartilhar pistas, retratos e lembretes sem interromper a narração.",
  },
  {
    icon: BookOpen,
    eyebrow: "Memória da aventura",
    title: "Acompanhe o diário da campanha",
    description: "O mestre registra resumos, pistas, personagens e objetivos em um diário sincronizado para o grupo.",
    actions: [
      "Abra Diário da campanha no menu Jornada.",
      "O mestre escreve ou atualiza as anotações e clica em Salvar diário.",
      "Os jogadores recebem o texto atualizado em tempo real e podem consultá-lo durante a sessão.",
    ],
    tip: "Use títulos e linhas em branco para separar sessões e deixar as anotações fáceis de consultar.",
  },
  {
    icon: Music2,
    eyebrow: "Trilha sonora",
    title: "Adicione músicas do YouTube",
    description: "O mestre escolhe um vídeo ou playlist e controla a reprodução sincronizada para toda a campanha.",
    actions: [
      "Abra Música da campanha no menu ou no topo da mesa.",
      "O mestre cola o link do vídeo ou playlist, define um nome e escolhe se deseja repetir.",
      "Cada participante clica uma vez em Ativar áudio sincronizado.",
      "Depois disso, tocar, pausar e buscar são comandados pelo mestre para todo o grupo.",
    ],
    tip: "O volume continua individual, mas a faixa e o tempo de reprodução são corrigidos automaticamente para manter o grupo junto.",
  },
  {
    icon: Radio,
    eyebrow: "Tudo pronto",
    title: "Jogue na web ou no Discord",
    description: "O RPGcord funciona no navegador com Google e dentro da Activity com a identidade do Discord.",
    actions: [
      "O indicador Mesa sincronizada confirma a conexão com o Firestore.",
      "Alterações feitas por qualquer integrante aparecem para o restante do grupo.",
      "Abra Ajuda no menu sempre que quiser rever este tutorial.",
    ],
    tip: "Para jogar no Discord, abra a Activity RPGcord em um canal de voz com seus amigos.",
  },
];

type Props = { onClose: () => void };

export function TutorialModal({ onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const Icon = step.icon;
  const isLast = index === steps.length - 1;

  return (
    <div className="tutorial-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <aside className="tutorial-index">
          <div className="tutorial-brand"><span><Sparkles /></span><strong>Como usar o RPGcord</strong></div>
          <nav aria-label="Etapas do tutorial">
            {steps.map((item, stepIndex) => {
              const StepIcon = item.icon;
              return (
                <button className={stepIndex === index ? "active" : stepIndex < index ? "done" : ""} key={item.title} onClick={() => setIndex(stepIndex)}>
                  <i>{stepIndex < index ? <Check /> : <StepIcon />}</i>
                  <span><small>Etapa {stepIndex + 1}</small>{item.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="tutorial-content">
          <button className="icon-button tutorial-close" onClick={onClose} aria-label="Fechar tutorial"><X size={19} /></button>
          <div className="tutorial-step-icon"><Icon /></div>
          <p className="eyebrow">{step.eyebrow}</p>
          <h2 id="tutorial-title">{step.title}</h2>
          <p className="tutorial-description">{step.description}</p>
          <ol>
            {step.actions.map((action) => <li key={action}><span><Check size={14} /></span>{action}</li>)}
          </ol>
          <div className="tutorial-tip"><Sparkles size={16} /><p><strong>Dica</strong>{step.tip}</p></div>
          <footer>
            <span>{index + 1} de {steps.length}</span>
            <div className="tutorial-dots">{steps.map((item, dotIndex) => <button aria-label={`Ir para etapa ${dotIndex + 1}`} className={dotIndex === index ? "active" : ""} key={item.title} onClick={() => setIndex(dotIndex)} />)}</div>
            <div>
              {index > 0 && <button className="secondary-button" onClick={() => setIndex((current) => current - 1)}><ChevronLeft size={16} /> Voltar</button>}
              <button className="primary-button" onClick={() => isLast ? onClose() : setIndex((current) => current + 1)}>{isLast ? <><Check size={16} /> Começar a jogar</> : <>Próximo <ChevronRight size={16} /></>}</button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
