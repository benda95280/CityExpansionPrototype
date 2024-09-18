from events import EventManager

DEBUG_MODE = True

class Commands:
    def __init__(self):
        self.commands = {}

    def register_command(self, name, function, options=None, description=""):
        self.commands[name] = {
            'function': function,
            'options': options or [],
            'description': description
        }

    def execute_command(self, command, game_state, event_manager):
        if command == 'help':
            return self.get_help_message()
        elif command in self.commands:
            return self.commands[command]['function'](game_state, event_manager)
        else:
            return f"Unknown command: {command}. Type 'help' for a list of available commands."

    def get_help_message(self):
        help_message = "Available commands:\n"
        for name, cmd in self.commands.items():
            options_str = " ".join(cmd['options']) if cmd['options'] else ""
            help_message += f"{name} {options_str}: {cmd['description']}\n"
        return help_message

commands = Commands()

def debug_on(game_state, event_manager):
    global DEBUG_MODE
    DEBUG_MODE = True
    event_manager.set_debug(True)
    return 'Debug mode enabled'

def debug_off(game_state, event_manager):
    global DEBUG_MODE
    DEBUG_MODE = False
    event_manager.set_debug(False)
    return 'Debug mode disabled'

def get_tick(game_state, event_manager):
    return f"Current tick: {game_state['tick']}"

def get_events(game_state, event_manager):
    events_info = [f"{e.name}: event_type={e.event_type}, interval={e.interval}, min_interval={e.min_interval}, max_interval={e.max_interval}, next_tick={e.next_tick}, active={e.active}" for e in event_manager.get_events()]
    return "Events:\n" + "\n".join(events_info)

commands.register_command('debug on', debug_on, description='Enable debug mode')
commands.register_command('debug off', debug_off, description='Disable debug mode')
commands.register_command('get tick', get_tick, description='Get the current tick count')
commands.register_command('get events', get_events, description='Get information about all events')

def handle_console_command(command, game_state, event_manager):
    return commands.execute_command(command, game_state, event_manager)
