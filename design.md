this is a simple webapp for testing build and deployment pipeline
techstack:
react + vite, runs locally (in docker?)
local postgres, run locally in docker
clerk for authentication
nodejs for the backend, run locally in docker
nginx to get webtraffic to the docker container, exposing the frontend only

the code is divided in front and backend, eventually this will be turned into a browsergame

everything will be run on this server. right now we only have one of everything, just the dev stage. later on we will put another one next to it to get prod. this should ideally just copy the docker compose but for now. lets focus on dev

features:
for now, the website is a simple test with a registration using authentication, displaying the users name if its
successful


folder structure

frontend
backend
docker-compose.yml

make it so i can run docker-compose up and everything is deployed
i think we should make us of local vite so that development is fast

