from datetime import datetime
from tasks import TaskManager

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
        if command == 'help':
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

def debug_on(game_state, task_manager):
    game_state['debug_mode'] = True
    return 'Debug mode enabled'

def debug_off(game_state, task_manager):
    game_state['debug_mode'] = False
    return 'Debug mode disabled'

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

commands.register_command('debug on', debug_on, description='Enable debug mode')
commands.register_command('debug off', debug_off, description='Disable debug mode')
commands.register_command('get tick', get_tick, description='Get the current tick count')
commands.register_command('get tasks', get_tasks, description='Get information about all tasks')
commands.register_command('get buildings', get_buildings, description='Get information about all buildings')
commands.register_command('get citizens', get_citizens, description='Get information about all citizens')
commands.register_command('get time', get_game_time, description='Get the current game date and time')
commands.register_command('toggle ff', toggle_fast_forward, description='Toggle fast forward mode')

def handle_console_command(command, game_state, task_manager):
    return commands.execute_command(command, game_state, task_manager)
