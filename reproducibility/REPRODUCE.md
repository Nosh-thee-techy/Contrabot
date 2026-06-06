# How to reproduce ContraBot results

## Requirements
Python 3.10+, Node.js 18+

## Setup
1. Clone the repo: git clone https://github.com/teamrko/contrabot
2. cd contrabot/backend
3. pip install -r requirements.txt
4. Copy .env.example to .env and add your ANTHROPIC_API_KEY
5. Run python ingest.py to load the WHO MEC knowledge base
6. Run python main.py to start the backend

## Run the demo notebook
cd reproducibility
jupyter notebook contrabot_demo.ipynb

## Run the web app
cd web && npm install && npm run dev

## Sample test
python test_profiles.py
