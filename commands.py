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
    print("Debug: Entering get_tasks function")
    current_tick = game_state['tick']
    tasks = task_manager.get_tasks()
    print(f"Debug: Number of tasks: {len(tasks)}")
    
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
        print(f"Debug: Task info: {task_info}")
    
    return "Tasks:\n" + "\n".join(tasks_info)

commands.register_command('debug on', debug_on, description='Enable debug mode')
commands.register_command('debug off', debug_off, description='Disable debug mode')
commands.register_command('get tick', get_tick, description='Get the current tick count')
commands.register_command('get tasks', get_tasks, description='Get information about all tasks')

def handle_console_command(command, game_state, task_manager):
    return commands.execute_command(command, game_state, task_manager)
