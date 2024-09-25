from datetime import datetime
from tasks import TaskManager
import random
from buildings import handle_place_building

class Commands:
    def __init__(self):
        self.commands = {}

    def register_command(self, name, function, options=None, description=""):
        self.commands[name] = {
            'function': function,
            'options': options or [],
            'description': description
        }

    def execute_command(self, command, game_state, task_manager):
        parts = command.split()
        if parts[0] == 'debug' and len(parts) > 1 and parts[1] in ['on', 'off']:
            component = parts[2] if len(parts) > 2 else 'all'
            if parts[1] == 'on':
                return debug_on(game_state, task_manager, component)
            else:
                return debug_off(game_state, task_manager, component)
        elif command == 'help':
            return self.get_help_message()
        elif command in self.commands:
            return self.commands[command]['function'](game_state, task_manager)
        else:
            return f"Unknown command: {command}. Type 'help' for a list of available commands."

    def get_help_message(self):
        help_message = "Available commands:\n"
        for name, cmd in self.commands.items():
            options_str = " ".join(cmd['options']) if cmd['options'] else ""
            help_message += f"{name} {options_str}: {cmd['description']}\n"
        return help_message

commands = Commands()

def debug_on(game_state, task_manager, component='all'):
    if component == 'all':
        game_state['debug_mode'] = True
        game_state['tasks_debug'] = True
        game_state['buildings_debug'] = True
        game_state['notifications_debug'] = True
        return 'Debug mode enabled for all components'
    elif component == 'main':
        game_state['debug_mode'] = True
        return 'Debug mode enabled for main component'
    elif component == 'tasks':
        game_state['tasks_debug'] = True
        return 'Debug mode enabled for tasks component'
    elif component == 'buildings':
        game_state['buildings_debug'] = True
        return 'Debug mode enabled for buildings component'
    elif component == 'notifications':
        game_state['notifications_debug'] = True
        return 'Debug mode enabled for notifications component'
    else:
        return f'Unknown component: {component}'

def debug_off(game_state, task_manager, component='all'):
    if component == 'all':
        game_state['debug_mode'] = False
        game_state['tasks_debug'] = False
        game_state['buildings_debug'] = False
        game_state['notifications_debug'] = False
        return 'Debug mode disabled for all components'
    elif component == 'main':
        game_state['debug_mode'] = False
        return 'Debug mode disabled for main component'
    elif component == 'tasks':
        game_state['tasks_debug'] = False
        return 'Debug mode disabled for tasks component'
    elif component == 'buildings':
        game_state['buildings_debug'] = False
        return 'Debug mode disabled for buildings component'
    elif component == 'notifications':
        game_state['notifications_debug'] = False
        return 'Debug mode disabled for notifications component'
    else:
        return f'Unknown component: {component}'

def get_tick(game_state, task_manager):
    return f"Current tick: {game_state['tick']}"

def get_tasks(game_state, task_manager):
    current_tick = game_state['tick']
    tasks = task_manager.get_tasks()
    
    if not tasks:
        return "No tasks found."
    
    tasks_info = []
    for t in tasks:
        task_info = (
            f"{t.name}: task_type={t.task_type}, "
            f"is_recurring={t.is_recurring}, "
            f"min_interval={t.min_interval}, max_interval={t.max_interval}, "
            f"next_execution_tick={t.next_execution_tick}, active={t.active}, "
            f"completion_percentage={t.completion_percentage}%, "
            f"ticks_until_execution={t.next_execution_tick - current_tick if t.next_execution_tick else 'N/A'}"
        )
        tasks_info.append(task_info)
    
    return "Tasks:\n" + "\n".join(tasks_info)

def get_buildings(game_state, task_manager):
    buildings = game_state['grid']
    if not buildings:
        return "No buildings found."
    
    building_info = []
    for coords, building in buildings.items():
        info = (
            f"Building at {coords}: type={building.type}, level={building.level}, "
            f"is_built={building.is_built}, construction_progress={building.construction_progress:.2f}, "
            f"total_accommodations={building.total_accommodations}, "
            f"occupied_accommodations={sum(len(acc) for acc in building.accommodations)}"
        )
        building_info.append(info)
    
    return "Buildings:\n" + "\n".join(building_info)

def get_citizens(game_state, task_manager):
    citizens = []
    for building in game_state['grid'].values():
        for accommodation in building.accommodations:
            citizens.extend(accommodation)
    
    if not citizens:
        return "No citizens found."
    
    citizen_info = []
    for citizen in citizens:
        info = (
            f"Citizen: {citizen['first_name']} {citizen['last_name']}, "
            f"gender={citizen['gender']}, age={calculate_age(citizen['birthday'])}, "
            f"job={citizen['previous_job']}, music={citizen['favorite_music']}"
        )
        citizen_info.append(info)
    
    return "Citizens:\n" + "\n".join(citizen_info)

def get_game_time(game_state, task_manager):
    current_date = game_state['current_date']
    return f"Current game date and time: {current_date.strftime('%Y-%m-%d %H:%M:%S')}"

def toggle_fast_forward(game_state, task_manager):
    game_state['fast_forward'] = not game_state.get('fast_forward', False)
    return f"Fast forward mode: {'ON' if game_state['fast_forward'] else 'OFF'}"

def calculate_age(birthday):
    today = datetime.now()
    return today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))

def run_stress_test(game_state, task_manager):
    building_count = 1000
    for _ in range(building_count):
        x = random.randint(-50, 50)
        y = random.randint(-50, 50)
        building_type = random.choice(['house', 'apartment', 'skyscraper'])
        handle_place_building({'x': x, 'y': y, 'building_type': building_type}, game_state, task_manager.socketio)
    return f"Stress test completed: {building_count} buildings placed."

commands.register_command('debug on', debug_on, options=['[component]'], description='Enable debug mode for a specific component or all components')
commands.register_command('debug off', debug_off, options=['[component]'], description='Disable debug mode for a specific component or all components')
commands.register_command('get tick', get_tick, description='Get the current tick count')
commands.register_command('get tasks', get_tasks, description='Get information about all tasks')
commands.register_command('get buildings', get_buildings, description='Get information about all buildings')
commands.register_command('get citizens', get_citizens, description='Get information about all citizens')
commands.register_command('get time', get_game_time, description='Get the current game date and time')
commands.register_command('toggle ff', toggle_fast_forward, description='Toggle fast forward mode')
commands.register_command('run_stress_test', run_stress_test, description='Run a stress test by placing 1000 random buildings')

def handle_console_command(command, game_state, task_manager):
    return commands.execute_command(command, game_state, task_manager)
