from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import time
import random
import math
from events import Event, EventManager
from commands import commands, get_help_message, handle_console_command

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

# Initialize EventManager
event_manager = EventManager()

# Game state
game_state = {
    'grid': {},
    'money': 1000,
    'population': 0,
    'total_accommodations': 0,
    'used_accommodations': 0,
    'tick': 0,
    'pending_citizens': [],
    'start_time': time.time() * 1000,  # Current time in milliseconds
    'buildings_data': buildings_data,  # Add buildings_data to game_state
    'debug': True,
}

# Add events to the EventManager
new_citizen_event = Event('new_citizen', 'random', min_interval=config['min_ticks_for_new_citizen'], max_interval=config['max_ticks_for_new_citizen'])
event_manager.add_event(new_citizen_event)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
    socketio.emit('game_state', serializable_game_state)
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
        serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
        socketio.emit('game_state', serializable_game_state)

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
            serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
            socketio.emit('game_state', serializable_game_state)

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
        serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
        socketio.emit('game_state', serializable_game_state)

@socketio.on('deny_citizen')
def handle_deny_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        game_state['pending_citizens'].pop(citizen_index)
    serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
    socketio.emit('game_state', serializable_game_state)

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

def generate_new_citizen():
    if game_state['debug']:
        print(f"Attempting to generate new citizen at tick {game_state['tick']}")
    available_building = find_available_building()
    if not available_building:
        if game_state['debug']:
            print("Failed to generate new citizen: No available buildings")
        return False
    if len(game_state['pending_citizens']) >= 5:
        if game_state['debug']:
            print("Failed to generate new citizen: Maximum pending citizens reached (5)")
        return False
    new_citizen = generate_citizen()
    game_state['pending_citizens'].append(new_citizen)
    socketio.emit('new_citizen', new_citizen)
    if game_state['debug']:
        print(f"New citizen generated successfully: {new_citizen}")
    return True

def handle_event(event):
    citizen_generated = False
    if event.name == 'new_citizen':
        citizen_generated = generate_new_citizen()

    if game_state['debug']:
        print(f"Event occurred: {event.name} at tick {game_state['tick']}")
        print(f"Next occurrence: tick {event.next_tick}")
        if event.name == 'new_citizen':
            if citizen_generated:
                print(f"New citizen generated: {game_state['pending_citizens'][-1]}")
            else:
                print("Attempted to generate new citizen, but none were added.")

def game_tick():
    while True:
        time.sleep(0.05)  # 20 ticks per second
        game_state['tick'] += 1
        
        for event in event_manager.update_events(game_state['tick']):
            handle_event(event)
        
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
            serializable_game_state = {**game_state, 'events': [event.to_dict() for event in event_manager.get_events()]}
            socketio.emit('game_state', serializable_game_state)

@socketio.on('console_command')
def handle_console_command(data):
    command = data['command']
    return handle_console_command(command, game_state, event_manager)

if __name__ == '__main__':
    socketio.start_background_task(game_tick)
    socketio.run(app, host='0.0.0.0', port=5000)
