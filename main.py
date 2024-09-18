from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import time
import random
import math

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

# Game state
game_state = {
    'grid': {},
    'money': 1000,
    'population': 0,
    'total_accommodations': 0,
    'used_accommodations': 0,
    'tick': 0,
    'next_citizen_tick': random.randint(config['min_ticks_for_new_citizen'], config['max_ticks_for_new_citizen']),
    'pending_citizens': [],
    'start_time': time.time() * 1000,  # Current time in milliseconds
    'buildings_data': buildings_data  # Add buildings_data to game_state
}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    socketio.emit('game_state', game_state)
    for citizen in game_state['pending_citizens']:
        socketio.emit('new_citizen', citizen)

@socketio.on('place_building')
def handle_place_building(data):
    x, y = data['x'], data['y']
    building_type = data['building_type']
    
    if game_state['money'] >= buildings_data[building_type]['price']:
        game_state['grid'][f"{x},{y}"] = {
            'type': building_type,
            'level': 1,
            'accommodations': [[] for _ in range(buildings_data[building_type]['accommodations'])],
            'total_accommodations': buildings_data[building_type]['accommodations']
        }
        game_state['money'] -= buildings_data[building_type]['price']
        game_state['total_accommodations'] += buildings_data[building_type]['accommodations']
        socketio.emit('game_state', game_state)

@socketio.on('upgrade_building')
def handle_upgrade_building(data):
    x, y = data['x'], data['y']
    building = game_state['grid'].get(f"{x},{y}")
    
    if building:
        building_type = building['type']
        next_level = building['level'] + 1
        upgrade_cost = buildings_data[building_type]['upgrade_cost'] * next_level
        
        if game_state['money'] >= upgrade_cost:
            building['level'] = next_level
            new_accommodations = buildings_data[building_type]['accommodations']
            building['accommodations'].extend([[] for _ in range(new_accommodations)])
            building['total_accommodations'] += new_accommodations
            game_state['total_accommodations'] += new_accommodations
            game_state['money'] -= upgrade_cost
            socketio.emit('game_state', game_state)

def find_available_building():
    for coords, building in game_state['grid'].items():
        for accommodation in building['accommodations']:
            if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                return coords
    return None

@socketio.on('accept_citizen')
def handle_accept_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        accepted_citizen = game_state['pending_citizens'].pop(citizen_index)
        available_building = find_available_building()
        if available_building:
            building = game_state['grid'][available_building]
            for accommodation in building['accommodations']:
                if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                    accommodation.append(accepted_citizen)
                    game_state['population'] += 1
                    game_state['used_accommodations'] += 1
                    socketio.emit('citizen_placed', {'citizen': accepted_citizen, 'building': available_building})
                    break
        socketio.emit('game_state', game_state)

@socketio.on('deny_citizen')
def handle_deny_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        game_state['pending_citizens'].pop(citizen_index)
    socketio.emit('game_state', game_state)

def generate_citizen():
    first_names = ['John', 'Jane', 'Mike', 'Emily', 'David', 'Sarah']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']
    genders = ['Male', 'Female']
    
    return {
        'first_name': random.choice(first_names),
        'last_name': random.choice(last_names),
        'gender': random.choice(genders),
        'age': random.randint(18, 80)
    }

def game_tick():
    while True:
        time.sleep(0.05)  # 20 ticks per second
        game_state['tick'] += 1
        
        # Check for new citizen
        if game_state['tick'] >= game_state['next_citizen_tick']:
            available_building = find_available_building()
            if available_building and len(game_state['pending_citizens']) < 5:  # Limit pending citizens to 5
                new_citizen = generate_citizen()
                game_state['pending_citizens'].append(new_citizen)
                game_state['next_citizen_tick'] = game_state['tick'] + random.randint(
                    config['min_ticks_for_new_citizen'],
                    config['max_ticks_for_new_citizen']
                )
                socketio.emit('new_citizen', new_citizen)
            else:
                # If no available building or too many pending citizens, postpone the next citizen check
                game_state['next_citizen_tick'] = game_state['tick'] + random.randint(
                    config['min_ticks_for_new_citizen'],
                    config['max_ticks_for_new_citizen']
                )
        
        # Calculate total population and used accommodations
        total_population = 0
        used_accommodations = 0
        for building in game_state['grid'].values():
            building_population = sum(len(accommodation) for accommodation in building['accommodations'])
            total_population += building_population
            used_accommodations += len([acc for acc in building['accommodations'] if acc])
        
        game_state['population'] = total_population
        game_state['used_accommodations'] = used_accommodations
        
        if game_state['tick'] % 20 == 0:  # Update clients every second
            socketio.emit('game_state', game_state)

if __name__ == '__main__':
    socketio.start_background_task(game_tick)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
