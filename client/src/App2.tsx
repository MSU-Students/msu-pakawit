import React, { useState } from 'react';
import './app2.css';
export const App2: React.FC = () => {
  const message = 'Hello There';
  const [members, setMembers] = useState([
    'Luffy',
    'Zoro',
    'Usop'
  ]);
  const [newMember, setNewMember] = useState('');
  function addNewMember() {
    setMembers([...members, newMember]);
  }
  return (
    <div>
      Hello World
      <div>
        { message }
      </div>
      <ul>
        {members.map((member) => {
          return (
          <li>{member}</li>
        );
        })}
      </ul>
      <input
        className={'my-input'} value={newMember}
        onChange={(e) => setNewMember(e.target.value) }
      />
      <button className={'my-button'} onClick={addNewMember}>Add New Member</button>
    </div>

  );
};
export default App2;
