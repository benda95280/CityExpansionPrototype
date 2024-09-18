from events import EventManager

commands = {
    'debug on': 'Enable debug mode',
    'debug off': 'Disable debug mode',
    'get tick': 'Get the current tick count',
    'get events': 'Get information about all events',
    'help': 'Show this help message'
}

def get_help_message():
    help_message = "Available commands:\n"
    for command, description in commands.items():
        help_message += f"{command}: {description}\n"
    return help_message

def handle_console_command(command, game_state, event_manager):
    if command == 'help':
        return get_help_message()
    elif command == 'debug on':
        game_state['debug'] = True
        event_manager.set_debug(True)
        return 'Debug mode enabled'
    elif command == 'debug off':
        game_state['debug'] = False
        event_manager.set_debug(False)
        return 'Debug mode disabled'
    elif command == 'get tick':
        return f"Current tick: {game_state['tick']}"
    elif command == 'get events':
        events_info = [f"{e.name}: event_type={e.event_type}, interval={e.interval}, min_interval={e.min_interval}, max_interval={e.max_interval}, next_tick={e.next_tick}, active={e.active}" for e in event_manager.get_events()]
        return "Events:\n" + "\n".join(events_info)
    elif command in commands:
        return f"Command '{command}' recognized, but not implemented yet."
    else:
        return f"Unknown command: {command}. Type 'help' for a list of available commands."
