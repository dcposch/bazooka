rsync -avr dist static bazooka.city:bazooka/

echo 'Killing old server...'
ssh bazooka.city 'screen -X -S bazooka quit'
echo 'Starting new server...'
ssh bazooka.city 'cd bazooka && screen -S bazooka -d -m node dist/server'