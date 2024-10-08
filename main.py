from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import time
from datetime import datetime, timedelta
from tasks import Task, TaskManager
from commands import Commands, handle_console_command
from buildings import buildings_data, find_available_building, handle_place_building, handle_upgrade_building, handle_expand_building, update_buildings, update_city_finances
from citizen import Citizen
from building import Building
from notification import Notification, NotificationManager
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

with open('config.json', 'r') as f:
    config = json.load(f)

game_state = {
    'grid': {},
    'money': 9999999,
    'population': 0,
    'total_accommodations': 0,
    'used_accommodations': 0,
    'tick': 0,
    'pending_citizens': [],
    'start_time': datetime.now(),
    'buildings_data': buildings_data,
    'current_date': datetime(2024, 1, 1),
    'ticking_speed': 0,
    'debug_mode': False,
    'tasks_debug': False,
    'buildings_debug': False,
    'notifications_debug': False,
    'fast_forward': False,
    'socketio': socketio
}

task_manager = TaskManager(game_state)
notification_manager = NotificationManager()
game_state['task_manager'] = task_manager
game_state['notification_manager'] = notification_manager

notification_manager.add_notification("Welcome to your new city! Start by placing some buildings.")
notification_manager.add_notification("Tip: Use the right-click menu to place buildings on the grid.")

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

@socketio.on('expand_building')
def handle_expand_building_socket(data):
    handle_expand_building(data, game_state, socketio)
    emit_game_state()

@socketio.on('accept_citizen')
def handle_accept_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        accepted_citizen = game_state['pending_citizens'].pop(citizen_index)
        available_building = find_available_building(game_state)
        if available_building:
            building = game_state['grid'][available_building]
            if building.is_built:
                max_people = buildings_data[building.type]['max_people_per_accommodation']
                if building.add_citizen(accepted_citizen.to_dict(), max_people):
                    game_state['population'] += 1
                    game_state['used_accommodations'] += 1
                    socketio.emit('citizen_placed', {
                        'citizen': accepted_citizen.to_dict(),
                        'building': available_building
                    })
                    game_state['notification_manager'].add_notification(f"Citizen {accepted_citizen.first_name} {accepted_citizen.last_name} has been accepted and placed in a {building.type}.")
    emit_game_state()

@socketio.on('deny_citizen')
def handle_deny_citizen(data):
    citizen_index = data['index']
    if 0 <= citizen_index < len(game_state['pending_citizens']):
        denied_citizen = game_state['pending_citizens'].pop(citizen_index)
        game_state['notification_manager'].add_notification(f"Citizen {denied_citizen.first_name} {denied_citizen.last_name} has been denied entry to the city.")
    emit_game_state()

@socketio.on('dismiss_notification')
def handle_dismiss_notification(data):
    index = data['index']
    try:
        game_state['notification_manager'].remove_notification(index)
        if game_state['notifications_debug']:
            print(f"Debug: Notification at index {index} removed successfully")
    except IndexError:
        if game_state['notifications_debug']:
            print(f"Debug: Failed to remove notification at index {index}. Index out of range.")
    except Exception as e:
        if game_state['notifications_debug']:
            print(f"Debug: Error removing notification: {str(e)}")
    emit_game_state()

def generate_new_citizen(game_state):
    if game_state['tasks_debug']:
        print(f"Attempting to generate new citizen at tick {game_state['tick']}")

    total_accommodations = sum(building.total_accommodations for building in game_state['grid'].values())
    if game_state['population'] >= total_accommodations:
        if game_state['tasks_debug']:
            print("Failed to generate new citizen: No available accommodations")
        return False

    if len(game_state['pending_citizens']) >= 5:
        if game_state['tasks_debug']:
            print("Failed to generate new citizen: Maximum pending citizens reached (5)")
        return False

    new_citizen = Citizen.generate_random_citizen()
    game_state['pending_citizens'].append(new_citizen)
    socketio.emit('new_citizen', new_citizen.to_dict())
    if game_state['tasks_debug']:
        print(f"New citizen generated successfully: {new_citizen.to_dict()}")
    return True

def game_loop(socketio):
    last_update = time.time()
    last_ticking_speed_update = time.time()
    ticks_since_last_update = 0
    while True:
        current_time = time.time()
        delta_time = current_time - last_update

        game_state['tick'] += 1
        ticks_since_last_update += 1

        if game_state['debug_mode']:
            print(f"Debug: Current tick: {game_state['tick']}")

        if game_state['tick'] % 20 == 0:
            game_state['current_date'] += timedelta(minutes=5)

        task_manager.update_tasks(game_state)

        update_buildings(game_state, socketio)
        update_city_finances(game_state)

        update_population_and_accommodations()

        if current_time - last_ticking_speed_update >= 1:
            game_state['ticking_speed'] = ticks_since_last_update
            ticks_since_last_update = 0
            last_ticking_speed_update = current_time

        if current_time - last_update >= 1:
            emit_game_state()
            last_update = current_time

        sleep_time = 0.01 if game_state['fast_forward'] else 0.05
        time.sleep(sleep_time)

def update_population_and_accommodations():
    total_population = 0
    used_accommodations = 0
    for building in game_state['grid'].values():
        building_population = sum(len(accommodation) for accommodation in building.accommodations)
        total_population += building_population
        used_accommodations += len([acc for acc in building.accommodations if acc])

    game_state['population'] = total_population
    game_state['used_accommodations'] = used_accommodations

def emit_game_state():
    serializable_game_state = {key: value for key, value in game_state.items() if key not in ['task_manager', 'notification_manager', 'socketio']}
    serializable_game_state['tasks'] = game_state['task_manager'].to_dict()
    serializable_game_state['notifications'] = game_state['notification_manager'].to_dict()
    serializable_game_state['pending_citizens'] = [citizen.to_dict() for citizen in game_state['pending_citizens']]
    serializable_game_state['current_date'] = game_state['current_date'].isoformat() if isinstance(game_state['current_date'], datetime) else game_state['current_date']
    serializable_game_state['start_time'] = game_state['start_time'].isoformat() if isinstance(game_state['start_time'], datetime) else game_state['start_time']
    serializable_game_state['buildings_data'] = buildings_data
    serializable_game_state['grid'] = {coords: building.to_dict() for coords, building in game_state['grid'].items()}

    # Add last_execution_tick for tasks
    for task in serializable_game_state['tasks']['tasks']:
        task['last_execution_tick'] = game_state['tick'] - (task['next_execution_tick'] - task['min_interval'])

    if game_state['debug_mode']:
        print("Debug: Tasks being sent to frontend:")
        for task in game_state['task_manager'].get_tasks():
            print(f"  - {task.name}: next_execution_tick={task.next_execution_tick}, completion_percentage={task.completion_percentage}")

        print(f"Debug: Serializable game state: {serializable_game_state}")

    socketio.emit('game_state', serializable_game_state)

@socketio.on('console_command')
def handle_console_command_socket(data):
    command = data['command']
    return handle_console_command(command, game_state, task_manager)

def initialize_tasks():
    new_citizen_task = Task('New citizen',
                            'random',
                            True,
                            generate_new_citizen,
                            min_interval=config['min_ticks_for_new_citizen'],
                            max_interval=config['max_ticks_for_new_citizen'],
                            hidden=True)
    task_manager.add_task(new_citizen_task)

    dummy_task1 = Task('Dummy task 1',
                       'classic',
                       True,
                       lambda gs: print("Dummy task 1 executed"),
                       min_interval=300)
    dummy_task2 = Task('Dummy task 2',
                       'random',
                       False,
                       lambda gs: print("Dummy task 2 executed"),
                       min_interval=200,
                       max_interval=600)
    task_manager.add_task(dummy_task1)
    task_manager.add_task(dummy_task2)

    if game_state['tasks_debug']:
        print("Debug: Tasks initialized")
        for task in task_manager.get_tasks():
            print(f"Debug: Task '{task.name}' registered with next execution at tick {task.next_execution_tick}")

if __name__ == '__main__':
    initialize_tasks()
    socketio.start_background_task(game_loop, socketio)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, log_output=True)