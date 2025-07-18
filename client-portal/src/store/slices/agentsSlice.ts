import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AgentsState {
  agents: any[];
}

const initialState: AgentsState = {
  agents: [],
};

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    setAgents(state, action: PayloadAction<any[]>) {
      state.agents = action.payload;
    },
    addAgent(state, action: PayloadAction<any>) {
      state.agents.push(action.payload);
    },
    removeAgent(state, action: PayloadAction<string>) {
      state.agents = state.agents.filter(agent => agent.id !== action.payload);
    },
  },
});

export const { setAgents, addAgent, removeAgent } = agentsSlice.actions;
export default agentsSlice.reducer;
