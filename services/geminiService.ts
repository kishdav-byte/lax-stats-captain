
import { GoogleGenAI, Type } from "@google/genai";
import { Game, Player, StatType } from '../types';
import { getApiKey } from './apiKeyService';

// FIX: Add PlayerAnalysisData interface to support the analytics feature.
export interface PlayerAnalysisData {
  name: string;
  position: string;
  totalGames: number;
  stats: { [key in StatType]?: number };
}

const formatGameDataForPrompt = (game: Game): string => {
  let prompt = `Analyze the following lacrosse game data and provide a concise, exciting game summary. Also, name a "Player of the Game" with a brief justification.\n\n`;
  
  prompt += `Final Score: ${game.homeTeam.name} - ${game.score.home}, ${game.awayTeam.name} - ${game.score.away}\n\n`;
  
  prompt += `Key Events:\n`;
  
  const allPlayers: Player[] = [...game.homeTeam.roster, ...game.awayTeam.roster];

  game.stats.forEach(stat => {
    const player = allPlayers.find(p => p.id === stat.playerId);
    const team = game.homeTeam.roster.some(p => p.id === stat.playerId) ? game.homeTeam : game.awayTeam;
    
    if (player) {
      let eventString = `- ${team.name}: #${player.jerseyNumber} ${player.name} (${player.position || 'N/A'}) - ${stat.type}`;
      if (stat.type === 'Goal' && stat.assistingPlayerId) {
        const assistPlayer = allPlayers.find(p => p.id === stat.assistingPlayerId);
        if (assistPlayer) {
          eventString += ` (Assist: #${assistPlayer.jerseyNumber} ${assistPlayer.name})`;
        }
      }
      prompt += `${eventString}\n`;
    }
  });

  return prompt;
};

export const generateGameSummary = async (game: Game): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const prompt = formatGameDataForPrompt(game);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating game summary:", error);
    return "Could not generate AI summary. Please check your API key and connection.";
  }
};


export const generateRosterFromText = async (pastedText: string): Promise<Omit<Player, 'id'>[]> => {
  if (!pastedText.trim()) {
    throw new Error("Pasted text cannot be empty.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const prompt = `Analyze the following text from a lacrosse team's website roster and extract the player information. Identify each player's name, jersey number, and position. The position might be abbreviated (e.g., A, M, D, G, LSM, FOGO). Do your best to standardize the position.

Pasted Text:
"""
${pastedText}
"""

Extract the roster and return it as a JSON array.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'The full name of the player.',
              },
              jerseyNumber: {
                type: Type.STRING,
                description: 'The player\'s jersey number.',
              },
              position: {
                type: Type.STRING,
                description: 'The player\'s position (e.g., Attack, Midfield, Defense, Goalie).',
              },
            },
            required: ["name", "jerseyNumber", "position"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const parsedRoster: Omit<Player, 'id'>[] = JSON.parse(jsonText);
    return parsedRoster;

  } catch (error) {
    console.error("Error generating roster:", error);
    let errorMessage = "Could not generate roster from the provided text. The AI failed to process the request.";
    if (error instanceof SyntaxError) {
      errorMessage = "The AI returned an invalid format. Please try again or adjust the pasted text.";
    }
    throw new Error(errorMessage);
  }
};

export const analyzeCodeProblem = async (question: string, code: string, fileName: string): Promise<string> => {
  if (!question.trim() || !code.trim()) {
    throw new Error("Question and code content cannot be empty.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    const prompt = `You are a world-class senior frontend engineer with deep expertise in React, TypeScript, and modern UI/UX design. An administrator of this application is asking for help with the codebase.

    The user is asking the following question about the file \`${fileName}\`:
    """
    ${question}
    """

    Here is the full content of the file \`${fileName}\`:
    \`\`\`typescript
    ${code}
    \`\`\`

    Please analyze the user's question and the provided code. Provide a clear, expert-level explanation of the issue or concept. If applicable, suggest specific improvements or bug fixes, including corrected code snippets. Structure your response in well-formatted markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using a more powerful model for code analysis
      contents: prompt,
    });
    
    return response.text;

  } catch (error) {
    console.error("Error analyzing code:", error);
    return "An error occurred while communicating with the AI. Please check the console for details.";
  }
};

// FIX: Add analyzePlayerPerformance function to support the analytics feature.
export const analyzePlayerPerformance = async (playerData: PlayerAnalysisData): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    let statsString = Object.entries(playerData.stats)
      .map(([stat, value]) => `- ${stat}: ${value}`)
      .join('\n');

    if (!statsString.trim()) {
      statsString = "No stats recorded for this player.";
    }

    const prompt = `
You are an expert lacrosse coach and performance analyst. Analyze the following player's performance based on their aggregated stats from ${playerData.totalGames} games.

Player Name: ${playerData.name}
Position: ${playerData.position}

Stats:
${statsString}

Provide a concise analysis of this player's strengths and weaknesses. Offer 2-3 specific, actionable suggestions for improvement. Structure your response in well-formatted markdown. Be encouraging but realistic in your feedback.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing player performance:", error);
    return "An error occurred while communicating with the AI. Please check your API key and connection.";
  }
};