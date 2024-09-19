from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import time
from datetime import datetime, timedelta
from events import Event, EventManager
from commands import Commands, handle_console_command
from buildings import buildings_data, find_available_building, handle_place_building, handle_upgrade_building, update_buildings, update_city_finances
from citizen import Citizen

DEBUG_MODE = True

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

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
    'start_time': datetime.now(),
    'event_manager': event_manager,
    'buildings_data': buildings_data,
    'current_date': datetime(2024, 1, 1),
}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    emit_game_state()

@socketio.on('place_building')
def handle_place_building_socket(data):
    handle_place_building(data, game_state, socketio)
    emit_game_state()

@socketio.on('upgrade_building')
def handle_upgrade_building_socket(data):
    handle_upgrade_building(data, game_state, socketio)
    emit_game_state()

@socketio.on('accept_citizen')
def handle_accept_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        accepted_citizen = game_state['pending_citizens'].pop(citizen_index)
        available_building = find_available_building(game_state)
        if available_building:
            building = game_state['grid'][available_building]
            for accommodation in building['accommodations']:
                if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                    accommodation.append(accepted_citizen.to_dict())
                    game_state['population'] += 1
                    game_state['used_accommodations'] += 1
                    socketio.emit('citizen_placed', {'citizen': accepted_citizen.to_dict(), 'building': available_building})
                    break
    emit_game_state()

@socketio.on('deny_citizen')
def handle_deny_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        game_state['pending_citizens'].pop(citizen_index)
    emit_game_state()

def generate_new_citizen(game_state):
    if DEBUG_MODE:
        print(f"Attempting to generate new citizen at {datetime.now()}")
    
    total_accommodations = sum(building['total_accommodations'] for building in game_state['grid'].values())
    if game_state['population'] >= total_accommodations:
        if DEBUG_MODE:
            print("Failed to generate new citizen: No available accommodations")
        return False
    
    if len(game_state['pending_citizens']) >= 5:
        if DEBUG_MODE:
            print("Failed to generate new citizen: Maximum pending citizens reached (5)")
        return False

    new_citizen = Citizen.generate_random_citizen()
    game_state['pending_citizens'].append(new_citizen)
    socketio.emit('new_citizen', new_citizen.to_dict())
    if DEBUG_MODE:
        print(f"New citizen generated successfully: {new_citizen.to_dict()}")
    return True

def game_loop():
    last_update = datetime.now()
    while True:
        current_time = datetime.now()
        delta_time = (current_time - last_update).total_seconds()
        
        # Update game state
        game_state['tick'] += 1
        
        # Update game time (5 minutes every 20 ticks)
        if game_state['tick'] % 20 == 0:
            game_state['current_date'] += timedelta(minutes=5)
        
        # Process events
        for event in event_manager.update_events(game_state):
            event.execute(game_state)
        
        # Update buildings and city finances
        update_buildings(game_state)
        update_city_finances(game_state)
        
        # Update population and accommodations
        update_population_and_accommodations()
        
        # Emit game state every second
        if (current_time - last_update).total_seconds() >= 1:
            emit_game_state()
            last_update = current_time
        
        time.sleep(0.05)  # 20 ticks per second

def update_population_and_accommodations():
    total_population = 0
    used_accommodations = 0
    for building in game_state['grid'].values():
        building_population = sum(len(accommodation) for accommodation in building['accommodations'])
        total_population += building_population
        used_accommodations += len([acc for acc in building['accommodations'] if acc])
    
    game_state['population'] = total_population
    game_state['used_accommodations'] = used_accommodations

def emit_game_state():
    serializable_game_state = {
        key: value for key, value in game_state.items() if key != 'event_manager'
    }
    serializable_game_state['events'] = game_state['event_manager'].to_dict()
    serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
    serializable_game_state['current_date'] = game_state['current_date'].isoformat()
    serializable_game_state['start_time'] = game_state['start_time'].isoformat()
    
    # Serialize datetime objects in the grid
    for building in serializable_game_state['grid'].values():
        if 'construction_start' in building:
            building['construction_start'] = building['construction_start'].isoformat()
        if 'construction_end' in building:
            building['construction_end'] = building['construction_end'].isoformat()
        if 'last_maintenance' in building:
            building['last_maintenance'] = building['last_maintenance'].isoformat()
    
    socketio.emit('game_state', serializable_game_state)

@socketio.on('console_command')
def handle_console_command_socket(data):
    command = data['command']
    return handle_console_command(command, game_state, event_manager)

def initialize_events():
    new_citizen_event = Event('new_citizen', 'random', generate_new_citizen, min_interval=config['min_ticks_for_new_citizen'], max_interval=config['max_ticks_for_new_citizen'])
    event_manager.add_event(new_citizen_event)

if __name__ == '__main__':
    initialize_events()
    socketio.start_background_task(game_loop)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)