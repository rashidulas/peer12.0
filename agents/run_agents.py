from agent_alpha import AgentAlpha
from agent_beta import AgentBeta

# create instances
alpha = AgentAlpha("Alpha")
beta = AgentBeta("Beta")

# link them as peers
alpha.peers = [beta]
beta.peers = [alpha]

# start both
alpha.start()
beta.start()

# keep alive
while True:
    pass
