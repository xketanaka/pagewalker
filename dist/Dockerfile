FROM node:22-bookworm-slim

RUN apt update -q \
    && apt install -y xvfb openbox x11vnc websockify novnc \
    && apt install -y libnss3 libasound2 libgbm-dev \
    && apt install -y supervisor \
    && apt install -y mariadb-client \
    && apt install -y poppler-utils \
    && apt install -y task-japanese locales-all

ENV CONF_PATH=/etc/supervisor/conf.d/supervisord.conf

RUN    echo '[supervisord]'                                                                  >> $CONF_PATH \
    && echo 'nodaemon=true'                                                                  >> $CONF_PATH \
    && echo 'user=root'                                                                      >> $CONF_PATH \
    && echo '[program:xvfb]'                                                                 >> $CONF_PATH \
    && echo 'command=xvfb-run -f /root/.Xauthority -n 10 -s "-screen 0 1200x900x24" openbox' >> $CONF_PATH \
    && echo '[program:vnc]'                                                                  >> $CONF_PATH \
    && echo 'command=x11vnc -display :10 -rfbport 5910 -forever -localhost'                  >> $CONF_PATH \
    && echo '[program:novnc]'                                                                >> $CONF_PATH \
    && echo 'command=websockify --web=/usr/share/novnc 8010 localhost:5910'                  >> $CONF_PATH

ENV DISPLAY=:10
EXPOSE 8010

CMD ["bash", "-c", "supervisord -c $CONF_PATH"]
