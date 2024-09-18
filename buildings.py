import json
from flask_socketio import emit

# Load building data
with open('static/data/buildings.json', 'r') as f:
    buildings_data = json.load(f)

def find_available_building(game_state):
    for coords, building in game_state['grid'].items():
        for accommodation in building['accommodations']:
            if len(accommodation) < buildings_data[building['type']]['max_people_per_accommodation']:
                return coords
    return None

def handle_place_building(data, game_state, socketio):
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
        serializable_game_state = {**game_state, 'events': [event.to_dict() for event in game_state['event_manager'].get_events()]}
        socketio.emit('game_state', serializable_game_state)

def handle_upgrade_building(data, game_state, socketio):
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
            serializable_game_state = {**game_state, 'events': [event.to_dict() for event in game_state['event_manager'].get_events()]}
            socketio.emit('game_state', serializable_game_state)
