from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import time
import random
import math
from events import Event, EventManager
from commands import Commands, handle_console_command
from buildings import buildings_data, find_available_building, handle_place_building, handle_upgrade_building
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
    'start_time': time.time() * 1000,  # Current time in milliseconds
    'event_manager': event_manager,  # Add event_manager to game_state
    'buildings_data': buildings_data,  # Add buildings_data to game_state
}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    serializable_game_state = {
        key: value for key, value in game_state.items() if key != 'event_manager'
    }
    serializable_game_state['events'] = [event.to_dict() for event in game_state['event_manager'].get_events()]
    serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
    print("Sending game state to client:", serializable_game_state)  # Debug log
    socketio.emit('game_state', serializable_game_state)
    for citizen in game_state['pending_citizens']:
        socketio.emit('new_citizen', citizen.to_dict())

@socketio.on('place_building')
def handle_place_building_socket(data):
    handle_place_building(data, game_state, socketio)

@socketio.on('upgrade_building')
def handle_upgrade_building_socket(data):
    handle_upgrade_building(data, game_state, socketio)

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
        serializable_game_state = {
            key: value for key, value in game_state.items() if key != 'event_manager'
        }
        serializable_game_state['events'] = [event.to_dict() for event in game_state['event_manager'].get_events()]
        serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
        socketio.emit('game_state', serializable_game_state)

@socketio.on('deny_citizen')
def handle_deny_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        game_state['pending_citizens'].pop(citizen_index)
    serializable_game_state = {
        key: value for key, value in game_state.items() if key != 'event_manager'
    }
    serializable_game_state['events'] = [event.to_dict() for event in game_state['event_manager'].get_events()]
    serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
    socketio.emit('game_state', serializable_game_state)

def generate_citizen():
    first_names = ['John', 'Jane', 'Mike', 'Emily', 'David', 'Sarah']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']
    genders = ['Male', 'Female']
    
    return Citizen(
        first_name=random.choice(first_names),
        last_name=random.choice(last_names),
        gender=random.choice(genders),
        age=random.randint(18, 80)
    )

def generate_new_citizen(game_state):
    if DEBUG_MODE:
        print(f"Attempting to generate new citizen at tick {game_state['tick']}")
    
    # Check if there are any available accommodations
    total_accommodations = sum(building['total_accommodations'] for building in game_state['grid'].values())
    if game_state['population'] >= total_accommodations:
        if DEBUG_MODE:
            print("Failed to generate new citizen: No available accommodations")
        return False
    
    # Rest of the function remains the same
    available_building = find_available_building(game_state)
    if not available_building:
        if DEBUG_MODE:
            print("Failed to generate new citizen: No available buildings")
        return False
    if len(game_state['pending_citizens']) >= 5:
        if DEBUG_MODE:
            print("Failed to generate new citizen: Maximum pending citizens reached (5)")
        return False
    new_citizen = generate_citizen()
    game_state['pending_citizens'].append(new_citizen)
    socketio.emit('new_citizen', new_citizen.to_dict())
    if DEBUG_MODE:
        print(f"New citizen generated successfully: {new_citizen.to_dict()}")
    return True

def game_tick():
    while True:
        time.sleep(0.05)  # 20 ticks per second
        game_state['tick'] += 1
        
        for event in event_manager.update_events(game_state['tick']):
            event.execute(game_state)
        
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
            serializable_game_state = {
                key: value for key, value in game_state.items() if key != 'event_manager'
            }
            serializable_game_state['events'] = [event.to_dict() for event in game_state['event_manager'].get_events()]
            serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
            socketio.emit('game_state', serializable_game_state)

@socketio.on('console_command')
def handle_console_command_socket(data):
    command = data['command']
    return handle_console_command(command, game_state, event_manager)

def check_debug_modes():
    global DEBUG_MODE
    if DEBUG_MODE:
        print("WARNING: Game debug mode is enabled by default.")
    if event_manager.debug:
        print("WARNING: Event manager debug mode is enabled by default.")

def initialize_events():
    new_citizen_event = Event('new_citizen', 'random', generate_new_citizen, min_interval=config['min_ticks_for_new_citizen'], max_interval=config['max_ticks_for_new_citizen'])
    event_manager.add_event(new_citizen_event)

if __name__ == '__main__':
    check_debug_modes()
    initialize_events()
    socketio.start_background_task(game_tick)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
